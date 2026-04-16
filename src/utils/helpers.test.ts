import { describe, it, expect } from "vitest";
import { isAudioFile, sanitizePath, normalizeTitle, getDirPath } from "../utils/helpers";

describe("isAudioFile", () => {
  const testCases = [
    { input: "song.mp3", expected: true },
    { input: "song.MP3", expected: true },
    { input: "song.wav", expected: true },
    { input: "song.WAV", expected: true },
    { input: "song.ogg", expected: true },
    { input: "song.mp4", expected: true },
    { input: "song.flac", expected: false },
    { input: "song.txt", expected: false },
    { input: "song", expected: false },
    { input: "歌曲.mp3", expected: true },
    { input: "My_Song_Name.mp3", expected: true },
  ];

  for (const tc of testCases) {
    it(`should return ${tc.expected} for "${tc.input}"`, () => {
      expect(isAudioFile(tc.input)).toBe(tc.expected);
    });
  }
});

describe("sanitizePath", () => {
  const testCases = [
    { input: "Rock/Pop/", expected: "Rock/Pop" },
    { input: "/Rock/Pop", expected: "Rock/Pop" },
    { input: "Rock/../Pop", expected: "Rock/Pop" },
    { input: "Rock//Pop///", expected: "Rock/Pop" },
    { input: "..", expected: "" },
    { input: "valid-dir", expected: "valid-dir" },
    { input: "", expected: "" },
    { input: "/", expected: "" },
  ];

  for (const tc of testCases) {
    it(`should sanitize "${tc.input}" to "${tc.expected}"`, () => {
      expect(sanitizePath(tc.input)).toBe(tc.expected);
    });
  }
});

describe("normalizeTitle", () => {
  const testCases = [
    { input: "Rock/song_name.mp3", expected: "song name" },
    { input: "My_Track.wav", expected: "My Track" },
    { input: "path/to/file.OGG", expected: "file" },
    { input: "simple", expected: "simple" },
  ];

  for (const tc of testCases) {
    it(`should normalize "${tc.input}" to "${tc.expected}"`, () => {
      expect(normalizeTitle(tc.input)).toBe(tc.expected);
    });
  }
});

describe("getDirPath", () => {
  const testCases = [
    { input: "Rock/Pop/song.mp3", expected: "Rock/Pop/" },
    { input: "song.mp3", expected: "" },
    { input: "A/B/C/D/file.wav", expected: "A/B/C/D/" },
  ];

  for (const tc of testCases) {
    it(`should extract dir from "${tc.input}" as "${tc.expected}"`, () => {
      expect(getDirPath(tc.input)).toBe(tc.expected);
    });
  }
});
