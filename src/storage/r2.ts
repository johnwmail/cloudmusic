import type { Env } from "../types";
import { isAudioFile } from "../utils/helpers";

/**
 * R2 Storage backend
 * Mirrors the S3/local filesystem helpers from main.go
 */

const MAX_LIST_KEYS = 1000; // R2 list() limit
const AUDIO_CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "audio/mp4",
};

/**
 * List contents of a directory (subdirs + audio files)
 * Equivalent to Go: s3List() / localList()
 */
export async function listDir(
  env: Env,
  prefix: string
): Promise<{ dirs: string[]; files: string[] }> {
  const fullPrefix = buildPrefix(prefix, env);

  const dirs = new Set<string>();
  const files: string[] = [];

  let cursor: R2ListOptions["cursor"] | undefined;

  do {
    const listed = await env.MUSIC_BUCKET.list({
      prefix: fullPrefix,
      delimiter: "/",
      limit: MAX_LIST_KEYS,
      cursor,
      include: ["httpMetadata", "customMetadata"],
    });

    // Common prefixes = directories
    for (const dir of listed.delimitedPrefixes) {
      const name = dir
        .replace(fullPrefix, "")
        .replace(/\/+$/, "");
      if (name) {
        dirs.add(name);
      }
    }

    // Objects = files
    for (const obj of listed.objects) {
      const name = obj.key.replace(fullPrefix, "");
      if (name && !name.includes("/")) {
        files.push(name);
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return { dirs: Array.from(dirs).sort(), files: files.sort() };
}

/**
 * List all audio files recursively under a prefix
 * Equivalent to Go: s3ListAllAudioFiles() / localListAllAudioFiles()
 */
export async function listAllAudioFiles(
  env: Env,
  prefix: string
): Promise<string[]> {
  const fullPrefix = buildPrefix(prefix, env);
  const allFiles: string[] = [];

  const basePrefix = env?.S3_PREFIX ?? "";
  const cleanBasePrefix = basePrefix ? (basePrefix.endsWith('/') ? basePrefix : basePrefix + '/') : "";

  let cursor: R2ListOptions["cursor"] | undefined;

  do {
    const listed = await env.MUSIC_BUCKET.list({
      ...(fullPrefix ? { prefix: fullPrefix } : {}),
      limit: MAX_LIST_KEYS,
      cursor,
    });

    for (const obj of listed.objects) {
      if (isAudioFile(obj.key)) {
        // Return key relative to the S3_PREFIX, not the subdirectory prefix
        const relativeKey = cleanBasePrefix ? obj.key.replace(cleanBasePrefix, "") : obj.key;
        allFiles.push(relativeKey);
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return allFiles.sort();
}

/**
 * List all directories recursively (including root "")
 * Equivalent to Go: s3ListAllDirs() / localListAllDirs()
 */
export async function listAllDirs(env: Env): Promise<string[]> {
  const allDirs = new Set<string>([""]); // Include root
  const dirPrefixes = new Set<string>();
  const basePrefix = env?.S3_PREFIX ?? "";
  const cleanBasePrefix = basePrefix
    ? basePrefix.endsWith("/")
      ? basePrefix
      : `${basePrefix}/`
    : "";
  const listPrefix = buildPrefix("", env);

  let cursor: R2ListOptions["cursor"] | undefined;

  do {
    const listed = await env.MUSIC_BUCKET.list({
      ...(listPrefix ? { prefix: listPrefix } : {}),
      limit: MAX_LIST_KEYS,
      cursor,
    });

    // Collect all delimited prefixes
    for (const dir of listed.delimitedPrefixes) {
      dirPrefixes.add(cleanBasePrefix ? dir.replace(cleanBasePrefix, "") : dir);
    }

    // Also extract dir prefixes from object keys
    for (const obj of listed.objects) {
      const relativeKey = cleanBasePrefix
        ? obj.key.replace(cleanBasePrefix, "")
        : obj.key;
      const parts = relativeKey.split("/");
      for (let i = 1; i < parts.length; i++) {
        const partialDir = parts.slice(0, i).join("/");
        dirPrefixes.add(partialDir + "/");
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  // Normalize directory names (remove trailing slash)
  for (const dir of dirPrefixes) {
    const name = dir.replace(/\/+$/, "");
    allDirs.add(name);
  }

  return Array.from(allDirs).sort();
}

/**
 * Search for audio files by term (case-insensitive)
 * Equivalent to Go: s3SearchFiles() / localSearchFiles()
 */
export async function searchFiles(
  env: Env,
  term: string
): Promise<string[]> {
  const allFiles = await listAllAudioFiles(env, "");
  const lcTerm = term.toLowerCase();
  return allFiles.filter((f) => f.toLowerCase().includes(lcTerm));
}

/**
 * Search for directories by term (case-insensitive)
 * Equivalent to Go: s3SearchDirs() / localSearchDirs()
 */
export async function searchDirs(
  env: Env,
  term: string
): Promise<string[]> {
  const allDirs = await listAllDirs(env);
  const lcTerm = term.toLowerCase();
  return allDirs
    .filter((d) => d.toLowerCase().includes(lcTerm))
    .map((d) => d + "/");
}

/**
 * Generate a pre-signed URL for audio streaming (15 minutes)
 * R2 doesn't have native presigned URLs like S3, but we can use
 * signed URLs or public URLs if bucket is public.
 * For now, we return a direct URL that the Worker can proxy.
 *
 * Equivalent to Go: s3GetPresignedUrl()
 */
export async function getPresignedUrl(
  env: Env,
  key: string
): Promise<string> {
  // R2 doesn't support presigned URLs natively via the Workers binding.
  // Option 1: Proxy the file through the Worker (recommended for private buckets)
  // Option 2: Use R2's public access if bucket is configured for it
  //
  // For compatibility with the existing frontend, we return a URL
  // that the Worker can use to stream the file.
  //
  // In production, you'd set up R2 public access or use Cloudflare's
  // signed URL feature. For now, we return a Worker-relative URL.
  return `/audio/${encodeAudioPath(key)}`;
}

/**
 * Get an R2 object for streaming
 */
export async function getObject(env: Env, key: string): Promise<R2ObjectBody | null> {
  const basePrefix = env?.S3_PREFIX ?? "";
  const cleanPrefix = basePrefix.endsWith("/") ? basePrefix : (basePrefix ? basePrefix + "/" : "");
  const fullKey = cleanPrefix + key.replace(/^\/+/, "");
  const object = await env.MUSIC_BUCKET.get(fullKey);
  return object;
}

export function getAudioContentType(key: string): string {
  const ext = `.${key.split(".").pop()?.toLowerCase()}`;
  return AUDIO_CONTENT_TYPES[ext] || "application/octet-stream";
}

/**
 * Build the full prefix with the configured S3_PREFIX
 */
function buildPrefix(prefix: string, env?: Env): string {
  const basePrefix = env?.S3_PREFIX ?? "";
  if (!basePrefix && !prefix) return "";
  const cleanPrefix = basePrefix.endsWith("/") ? basePrefix : (basePrefix ? basePrefix + "/" : "");
  const cleanDir = prefix.endsWith("/") ? prefix : (prefix ? prefix + "/" : "");
  return cleanPrefix + cleanDir;
}

function encodeAudioPath(path: string): string {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}
