import type { Context } from "hono";
import type { Env } from "../types";
import * as r2 from "../storage/r2";

type AppContext = Context<{ Bindings: Env }>;

/**
 * Handle POST /api requests
 * Equivalent to Go: handleRequest()
 */
export function createApiHandler(): (c: AppContext) => Promise<Response> {
  return async (c) => {
    let req: { function: string; data: string };

    const contentType = c.req.header("Content-Type") || "";

    if (contentType.includes("application/json")) {
      try {
        req = await c.req.json();
      } catch {
        return c.json({ status: "error", message: "Invalid JSON" }, 400);
      }
    } else {
      // Form data fallback
      const formData = await c.req.formData();
      req = {
        function: formData.get("dffunc") as string,
        data: formData.get("dfdata") as string,
      };
    }

    const env: Env = c.env as Env;

    switch (req.function) {
      case "dir":
        return handleDirRequest(c, env, req.data);
      case "searchInDir":
        return handleSearchInDir(c, env, req.data);
      case "searchTitle":
        return handleSearchTitle(c, env, req.data);
      case "searchDir":
        return handleSearchDir(c, env, req.data);
      case "getAllMp3":
        return handleGetAllMp3(c, env);
      case "getAllMp3InDir":
        return handleGetAllMp3InDir(c, env, req.data);
      case "getAllDirs":
        return handleGetAllDirs(c, env);
      case "getAllMp3InDirs":
        return handleGetAllMp3InDirs(c, env, req.data);
      default:
        return c.json({ status: "error", message: "Unknown function" });
    }
  };
}

/**
 * Handle dir request
 * Equivalent to Go: handleDirRequest()
 */
async function handleDirRequest(c: AppContext, env: Env, dir: string) {
  try {
    const { dirs, files } = await r2.listDir(env, dir);
    return c.json({
      status: "ok",
      dir,
      dirs,
      files,
    });
  } catch (err) {
    console.error("List error:", err);
    return c.json({
      status: "error",
      message: "Server is unable to access the directory.",
      dir,
      dirs: [],
      files: [],
    });
  }
}

/**
 * Handle searchInDir request (recursive search)
 * Equivalent to Go: handleSearchInDir()
 */
async function handleSearchInDir(c: AppContext, env: Env, raw: string) {
  let req: { dir: string; term: string; limit?: number };
  try {
    req = JSON.parse(raw);
  } catch {
    return c.json({ status: "error", message: "Invalid request" });
  }

  const term = req.term?.trim() || "";
  const minSearch = parseInt(env.MIN_SEARCH_STR) || 1;

  if (term.length < minSearch) {
    return c.json({
      status: "error",
      message: `Minimum search characters: ${minSearch}`,
      matches: [],
    });
  }

  // Sanitize dir
  const dir = req.dir?.trim().replace(/^\/+/, "").replace(/\.\./g, "") || "";

  let limit = req.limit || 200;
  if (limit <= 0) limit = 200;
  if (limit > 1000) limit = 1000;

  const files = await r2.listAllAudioFiles(env, dir);
  const lcTerm = term.toLowerCase();
  const matches = [];

  for (const f of files) {
    if (f.toLowerCase().includes(lcTerm)) {
      const base = f.split("/").pop() || f;
      const name = base.replace(/\.[^.]+$/, "").replace(/_/g, " ");
      let dirpath = f.split("/").slice(0, -1).join("/");
      if (dirpath === ".") dirpath = "";
      else if (dirpath && !dirpath.endsWith("/")) dirpath += "/";

      matches.push({ path: f, title: name, dir: dirpath });
      if (matches.length >= limit) break;
    }
  }

  return c.json({ status: "ok", matches, count: matches.length });
}

/**
 * Handle searchTitle request
 * Equivalent to Go: handleSearchTitle()
 */
async function handleSearchTitle(c: AppContext, env: Env, searchStr: string) {
  searchStr = searchStr.trim();
  const minSearch = parseInt(env.MIN_SEARCH_STR) || 1;
  const maxResult = parseInt(env.MAX_SEARCH_RESULT) || 100;

  if (searchStr.length < minSearch) {
    return c.json({
      status: "error",
      message: `Minimum search characters: ${minSearch}`,
      titles: [],
    });
  }

  const titles = await r2.searchFiles(env, searchStr);
  const limited = titles.slice(0, maxResult);
  return c.json({ status: "ok", titles: limited.sort() });
}

/**
 * Handle searchDir request
 * Equivalent to Go: handleSearchDir()
 */
async function handleSearchDir(c: AppContext, env: Env, searchStr: string) {
  searchStr = searchStr.trim();
  const minSearch = parseInt(env.MIN_SEARCH_STR) || 1;
  const maxResult = parseInt(env.MAX_SEARCH_RESULT) || 100;

  if (searchStr.length < minSearch) {
    return c.json({
      status: "error",
      message: `Minimum search characters: ${minSearch}`,
      dirs: [],
    });
  }

  const dirs = await r2.searchDirs(env, searchStr);
  const limited = dirs.slice(0, maxResult);
  return c.json({ status: "ok", dirs: limited.sort() });
}

/**
 * Handle getAllMp3 request
 * Equivalent to Go: handleGetAllMp3()
 */
async function handleGetAllMp3(c: AppContext, env: Env) {
  try {
    const files = await r2.listAllAudioFiles(env, "");
    return c.json({ status: "ok", files });
  } catch (err) {
    console.error("Get all mp3 error:", err);
    return c.json({
      status: "error",
      message: "Failed to scan music files",
    });
  }
}

/**
 * Handle getAllMp3InDir request
 * Equivalent to Go: handleGetAllMp3InDir()
 */
async function handleGetAllMp3InDir(c: AppContext, env: Env, data: string) {
  let dir: string;
  try {
    dir = JSON.parse(data);
  } catch {
    return c.json({
      status: "error",
      message: "Invalid directory path",
    });
  }

  try {
    const files = await r2.listAllAudioFiles(env, dir);
    return c.json({ status: "ok", files });
  } catch (err) {
    console.error("Get all mp3 in dir error:", err);
    return c.json({
      status: "error",
      message: "Failed to scan music directory",
    });
  }
}

/**
 * Handle getAllDirs request
 * Equivalent to Go: handleGetAllDirs()
 */
async function handleGetAllDirs(c: AppContext, env: Env) {
  try {
    const dirs = await r2.listAllDirs(env);
    if (dirs.length > 1) {
      const [root, ...rest] = dirs;
      return c.json({ status: "ok", dirs: [root, ...rest.sort()] });
    }
    return c.json({ status: "ok", dirs });
  } catch (err) {
    console.error("Get all dirs error:", err);
    return c.json({
      status: "error",
      message: "Failed to scan directories",
    });
  }
}

/**
 * Handle getAllMp3InDirs request
 * Equivalent to Go: handleGetAllMp3InDirs()
 */
async function handleGetAllMp3InDirs(c: AppContext, env: Env, data: string) {
  let selectedFolders: string[];
  try {
    selectedFolders = JSON.parse(data);
  } catch {
    return c.json({ status: "error", message: "Invalid folder data" });
  }

  const allFiles: string[] = [];
  for (const folder of selectedFolders) {
    try {
      const files = await r2.listAllAudioFiles(env, folder);
      allFiles.push(...files);
    } catch (err) {
      console.error(`Get all mp3 in dirs error (${folder}):`, err);
    }
  }

  // Deduplicate
  const uniqueFiles = [...new Set(allFiles)];
  return c.json({ status: "ok", files: uniqueFiles.sort() });
}
