/**
 * Converts Markdown text to TorrentHR-compliant BBCode.
 * Supports headers, bold, italics, strikethrough, links, images, blockquotes,
 * code blocks, inline code, horizontal rules, and lists.
 */
export function markdownToBbcode(markdown: string): string {
  if (!markdown) return "";

  let text = markdown;

  // 1. Code blocks (fenced ```...```)
  text = text.replace(/```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/g, (_match, p1) => {
    return `[code]\n${p1.trim()}\n[/code]`;
  });

  // 2. Inline code (`code`)
  text = text.replace(/`([^`\n]+)`/g, "[code]$1[/code]");

  // 3. Images: ![alt](url) -> [img=350]url[/img]
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "[img=350]$2[/img]");

  // 4. Links: [text](url) -> [url=url]text[/url]
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "[url=$2]$1[/url]");

  // 5. Bold & Italic
  // Bold + Italic: ***text*** or ___text___
  text = text.replace(/(\*\*\*|___)([\s\S]*?)\1/g, "[b][i]$2[/i][/b]");
  // Bold: **text** or __text__
  text = text.replace(/(\*\*|__)([\s\S]*?)\1/g, "[b]$2[/b]");
  // Italic: *text* or _text_
  text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "[i]$1[/i]");
  text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "[i]$1[/i]");
  // Strikethrough: ~~text~~
  text = text.replace(/~~([\s\S]*?)~~/g, "[s]$1[/s]");

  // 6. Line by line processing
  const lines = text.split("\n");
  const resultLines: string[] = [];
  let inQuote = false;
  let quoteBuffer: string[] = [];

  const flushQuote = () => {
    if (quoteBuffer.length > 0) {
      resultLines.push(`[quote]\n${quoteBuffer.join("\n")}\n[/quote]`);
      quoteBuffer = [];
      inQuote = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blockquotes
    if (trimmed.startsWith(">")) {
      inQuote = true;
      quoteBuffer.push(trimmed.replace(/^>\s?/, ""));
      continue;
    } else if (inQuote) {
      flushQuote();
    }

    // Headers (# to ######)
    if (/^#{6}\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^#{6}\s+(.*)$/, "[b][size=2]$1[/size][/b]"));
    } else if (/^#{5}\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^#{5}\s+(.*)$/, "[b][size=3]$1[/size][/b]"));
    } else if (/^#{4}\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^#{4}\s+(.*)$/, "[b][size=3]$1[/size][/b]"));
    } else if (/^#{3}\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^#{3}\s+(.*)$/, "[b][size=4]$1[/size][/b]"));
    } else if (/^#{2}\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^#{2}\s+(.*)$/, "[b][size=5]$1[/size][/b]"));
    } else if (/^#{1}\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^#{1}\s+(.*)$/, "[b][size=6]$1[/size][/b]"));
    }
    // Horizontal rule
    else if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      resultLines.push("--------------------------------------------------");
    }
    // Lists
    else if (/^[-*+]\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^[-*+]\s+(.*)$/, "[*] $1"));
    } else if (/^\d+\.\s+(.*)$/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^\d+\.\s+(.*)$/, "[*] $1"));
    } else {
      resultLines.push(rawLine);
    }
  }

  if (inQuote) {
    flushQuote();
  }

  return resultLines.join("\n");
}
