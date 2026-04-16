import { AUDIO_EXTENSIONS } from "../types";

/**
 * Check if a filename has an audio extension (case-insensitive)
 */
export function isAudioFile(filename: string): boolean {
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Sanitize a directory path to prevent traversal attacks
 */
export function sanitizePath(path: string): string {
  let cleaned = path.replace(/^\/+/, "");
  cleaned = cleaned.replace(/(^|\/)\.\.(?=\/|$)/g, "$1");
  cleaned = cleaned.replace(/\/{2,}/g, "/");
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned.replace(/^\/+/, "");
}

/**
 * Normalize a title by removing path and extension, replacing underscores
 */
export function normalizeTitle(filePath: string): string {
  const base = filePath.split("/").pop() || filePath;
  const name = base.replace(/\.[^.]+$/, ""); // Remove extension
  return name.replace(/_/g, " ");
}

/**
 * Get the directory portion of a path
 */
export function getDirPath(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop(); // Remove filename
  const dir = parts.join("/");
  return dir === "." ? "" : dir + (dir ? "/" : "");
}
