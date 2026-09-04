/**
 * Release title formatting and intelligent folder metadata parsing.
 */

export function formatCleanTitle(name: string): string {
  if (!name) return "";

  // 1. Spacing before audio codecs & channels (e.g. DDP5.1 -> DDP 5.1, AAC2.0 -> AAC 2.0)
  let s = name.replace(
    /\b(DDP|DD\+|DD|AAC|AC3|EAC3|DTS(?:-HD(?: MA)?)?|TrueHD|FLAC|LPCM)[.\-_]?([1-9]\.[0-2])\b/gi,
    "$1 $2"
  );

  // 2. Protect specific dots
  s = s.replace(/\b([HhXx])\.(26[45])\b/g, "$1@@DOT@@$2");
  s = s.replace(/\b(\d)\.(\d)\b/g, "$1@@DOT@@$2");
  s = s.replace(/\b(v\d+)\.(\d+)\b/gi, "$1@@DOT@@$2");

  // 3. Replace remaining dots with spaces
  s = s.replace(/\./g, " ");

  // 4. Restore protected dots
  s = s.replace(/@@DOT@@/g, ".");

  // 5. Clean up multiple spaces and trim
  return s.replace(/\s+/g, " ").trim();
}

export interface ParsedFolderInfo {
  cleanTitle: string;
  category: string;
  type: string;
  resolution: string;
  year?: string;
}

export function parseFolderMetadata(folderPath: string): ParsedFolderInfo {
  const folderName = folderPath.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
  const cleanTitle = formatCleanTitle(folderName);
  const lower = folderName.toLowerCase();

  // Resolution detection
  let resolution = "";
  if (lower.includes("2160p") || lower.includes("4k") || lower.includes("uhd")) resolution = "2160p";
  else if (lower.includes("1080p")) resolution = "1080p";
  else if (lower.includes("1080i")) resolution = "1080i";
  else if (lower.includes("720p")) resolution = "720p";
  else if (lower.includes("576p")) resolution = "576p";
  else if (lower.includes("576i")) resolution = "576i";
  else if (lower.includes("480p")) resolution = "480p";
  else if (lower.includes("480i")) resolution = "480i";

  // Type / Source detection
  let type = "";
  if (lower.includes("remux")) type = "remux";
  else if (lower.includes("web-dl") || lower.includes("webdl")) type = "webdl";
  else if (lower.includes("webrip") || lower.includes("web-rip")) type = "webrip";
  else if (lower.includes("hdtv")) type = "hdtv";
  else if (lower.includes("dvdrip")) type = "dvdrip";
  else if (lower.includes("bluray") || lower.includes("bdmv") || lower.includes("dvd9") || lower.includes("dvd5") || lower.includes(".iso")) type = "disc";
  else if (lower.includes("x264") || lower.includes("x265") || lower.includes("hevc") || lower.includes("avc")) type = "encode";

  // Category detection
  let category = "";
  if (lower.includes("s0") || lower.includes("s1") || lower.includes("season") || /\b\d{1,2}x\d{2}\b/i.test(lower)) {
    category = "tv";
  } else if (lower.includes("flac")) {
    category = "29"; // Glazba / FLAC
  } else if (lower.includes("mp3") || lower.includes("album") || lower.includes("discography") || lower.includes("ost")) {
    category = "3"; // Glazba / MP3
  } else if (lower.includes("fitgirl") || lower.includes("dodi") || lower.includes("elamigos") || lower.includes("repack") && !type) {
    category = "5"; // Igre / PC
  } else if (lower.includes("docu") || lower.includes("documentary")) {
    category = "12"; // Dokumentarci
  } else if (lower.includes("anime")) {
    category = "31"; // Anime
  } else {
    // Default to movies
    category = "movie";
  }

  // Year detection
  const yearMatch = cleanTitle.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : undefined;

  return {
    cleanTitle,
    category,
    type,
    resolution,
    year
  };
}
