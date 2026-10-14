/**
 * Release title formatting and intelligent folder metadata parsing.
 */

export function formatCleanTitle(name: string): string {
  if (!name) return "";

  // 1. Spacing before audio codecs & channels (e.g. DDP5.1 -> DDP 5.1, AAC2.0 -> AAC 2.0, DTS-HD.MA.5.1 -> DTS-HD MA 5.1)
  let s = name.replace(
    /\b(DDP|DD\+|DD|AAC|AC3|EAC3|DTS(?:-HD(?:[.\-_ ]MA)?)?|TrueHD|FLAC|LPCM)[.\-_]?([1-9]\.[0-2](?:\.[0-4])?)\b/gi,
    "$1 $2"
  );

  // 2. Protect specific dots
  s = s.replace(/\b([HhXx])\.(26[45])\b/g, "$1@@DOT@@$2");
  s = s.replace(/\b(\d)\.(\d)(?:\.(\d))?\b/g, (_, a, b, c) =>
    c ? `${a}@@DOT@@${b}@@DOT@@${c}` : `${a}@@DOT@@${b}`
  );
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
  if (/\b(2160p|4k|uhd)\b/i.test(lower)) resolution = "2160p";
  else if (/\b1080p\b/i.test(lower)) resolution = "1080p";
  else if (/\b1080i\b/i.test(lower)) resolution = "1080i";
  else if (/\b720p\b/i.test(lower)) resolution = "720p";
  else if (/\b576p\b/i.test(lower)) resolution = "576p";
  else if (/\b576i\b/i.test(lower)) resolution = "576i";
  else if (/\b480p\b/i.test(lower)) resolution = "480p";
  else if (/\b480i\b/i.test(lower)) resolution = "480i";

  const hasEncodeCodec = /\b(x264|x265|h\.?264|h\.?265|hevc|xvid|divx|av1|bdrip|brrip)\b/i.test(lower);

  // Type / Source detection
  let type = "";
  if (/\bremux\b/i.test(lower)) type = "remux";
  else if (/\bweb-?rip\b/i.test(lower)) type = "webrip";
  else if (/\bweb-?dl\b/i.test(lower) || /\bweb\b/i.test(lower)) type = "webdl";
  else if (/\bhdtv\b/i.test(lower)) type = "hdtv";
  else if (/\bdvd-?rip\b/i.test(lower)) type = "dvdrip";
  else if (/\b(bdmv|video_ts|dvd9|dvd5)\b/i.test(lower) || /\.iso$/i.test(lower)) type = "disc";
  else if (hasEncodeCodec) type = "encode";
  else if (/\b(bluray|blu-ray)\b/i.test(lower)) type = "disc";
  else if (/\bavc\b/i.test(lower)) type = "encode";

  const hasVideoIndicators = Boolean(
    resolution ||
    type ||
    /\b(bluray|blu-ray|bdrip|brrip|web-?dl|web-?rip|hdrip|dvdrip|hdtv|remux|x264|x265|h\.?264|h\.?265|hevc|avc|xvid|divx|mkv|mp4|avi)\b/i.test(lower)
  );

  // Category detection
  let category = "";
  if (
    /\bs\d{1,2}e\d{1,2}\b/i.test(lower) ||
    /\bs\d{2}\b/i.test(lower) ||
    /\bs\d{1,2}\b(?=[\s._\-\[\(]*(?:complete|pack|1080|720|2160|480|576|bluray|web|hdtv|dvd|bdrip|x264|x265|hevc|h\.?264|h\.?265))/i.test(lower) ||
    /\b(season|series)\s*\d+\b/i.test(lower) ||
    /\b\d{1,2}x\d{2}\b/i.test(lower)
  ) {
    category = "tv";
  } else if (!hasVideoIndicators && /\b(flac|lossless|24bit)\b/i.test(lower)) {
    category = "29"; // Glazba / FLAC
  } else if (!hasVideoIndicators && /\b(mp3|320kbps|cbr|vbr|ost|soundtrack|discography)\b/i.test(lower)) {
    category = "3"; // Glazba / MP3
  } else if (/\b(docu|documentary)\b/i.test(lower)) {
    category = "12"; // Dokumentarci
  } else if (/\banime\b/i.test(lower)) {
    category = "31"; // Anime
  } else {
    // Default to movies
    category = "movie";
  }

  // Year detection
  const yearMatch = cleanTitle.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Clean title for bracketed years, e.g. "The African Queen (1951)" -> "The African Queen"
  let displayTitle = cleanTitle;
  if (year && /\(\s*(19\d{2}|20\d{2})\s*\)/.test(cleanTitle)) {
    const stripped = cleanTitle.replace(/\s*\(\s*(19\d{2}|20\d{2})\s*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    if (stripped) {
      displayTitle = stripped;
    }
  }

  // Music overrides: FLAC / MP3 on UNIT3D have no resolution and use other type
  if (category === "29" || category === "3") {
    type = "other";
    resolution = "other";
  }

  return {
    cleanTitle: displayTitle,
    category,
    type,
    resolution,
    year
  };
}
