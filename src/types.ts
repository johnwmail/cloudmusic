// Types for the Cloudflare migration of go-music

export interface Env {
  MUSIC_BUCKET: R2Bucket;
  S3_PREFIX: string;
  MIN_SEARCH_STR: string;
  MAX_SEARCH_RESULT: string;
}

export interface ApiRequest {
  function: string;
  data: string;
}

export interface DirResponse {
  status: "ok" | "error";
  message?: string;
  dir: string;
  dirs: string[];
  files: string[];
}

export interface SearchTitleResponse {
  status: "ok" | "error";
  message?: string;
  titles: string[];
}

export interface SearchDirResponse {
  status: "ok" | "error";
  message?: string;
  dirs: string[];
}

export interface SearchInDirRequest {
  dir: string;
  term: string;
  limit?: number;
}

export interface SearchInDirMatch {
  path: string;
  title: string;
  dir: string;
}

export interface SearchInDirResponse {
  status: "ok" | "error";
  message?: string;
  matches: SearchInDirMatch[];
  count: number;
}

export interface GetAllMp3Response {
  status: "ok" | "error";
  message?: string;
  files: string[];
}

export interface GetAllDirsResponse {
  status: "ok" | "error";
  message?: string;
  dirs: string[];
}

export interface AudioUrlResponse {
  url: string;
}

export const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".mp4"] as const;

export type AudioExtension = (typeof AUDIO_EXTENSIONS)[number];
