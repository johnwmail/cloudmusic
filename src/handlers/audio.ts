import type { Context } from "hono";
import type { Env } from "../types";
import * as r2 from "../storage/r2";

type AppContext = Context<{ Bindings: Env }>;

/**
 * Handle GET /audio/*path requests
 * Returns a URL for audio streaming (compatible with Go: audioProxyHandler)
 */
export async function audioProxyHandler(c: AppContext, env: Env) {
  // Extract path from URL using Hono's built-in `path` helper.
  let key = c.req.path.replace(/^\/audio\//, "");

  if (!key) {
    return c.json({ error: "Missing song path" }, 400);
  }

  try {
    key = decodeURIComponent(key);
  } catch {
    return c.json({ error: "Invalid path" }, 400);
  }

  // Validate path to prevent directory traversal
  if (key.includes("..") || key.startsWith("/")) {
    return c.json({ error: "Invalid path" }, 400);
  }

  // For R2, we stream the file directly through the Worker
  const object = await r2.getObject(env, key);
  if (!object || object.size === 0) {
    return c.json({ error: "Audio not found or is empty" }, 404);
  }

  // Stream the file directly
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", r2.getAudioContentType(key));
  }
  headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );
  headers.set("Content-Length", object.size.toString());

  return new Response(object.body, { headers });
}

/**
 * Handle GET /localdisk/*path requests (deprecated in Cloudflare, R2-only)
 * For Cloudflare, we proxy through R2 directly instead of local disk.
 */
export async function localDiskHandler(c: AppContext, env: Env) {
  // In Cloudflare Workers, we don't have local disk access.
  // This handler is kept for compatibility but redirects to R2.
  let key = c.req.param("path") || "";
  key = key.replace(/^\/+/, "");

  try {
    key = decodeURIComponent(key);
  } catch {
    return c.text("Invalid path", 400);
  }

  if (!key || key.includes("..") || key.startsWith("/")) {
    return c.text("Invalid path", 400);
  }

  const object = await r2.getObject(env, key);
  if (!object || object.size === 0) {
    return c.text("Audio not found or is empty", 404);
  }

  // Stream the file directly
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", r2.getAudioContentType(key));
  }
  headers.set("etag", object.httpEtag);
  headers.set("Content-Length", object.size.toString());
  headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );

  return new Response(object.body, { headers });
}
