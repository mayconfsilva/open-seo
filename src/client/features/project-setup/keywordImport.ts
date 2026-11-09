interface ImportedKeyword {
  keyword: string;
  group: string | null;
  targetUrl: string | null;
}

interface KeywordImport {
  keywords: ImportedKeyword[];
  /** 1-based line numbers of data rows with no keyword. */
  skippedLines: number[];
}

const KEYWORD_HEADERS = [
  "palavra",
  "palavra-chave",
  "termo",
  "keyword",
  "busca",
];
const GROUP_HEADERS = ["grupo", "group"];
const TARGET_HEADERS = [
  "pagina alvo",
  "página alvo",
  "pagina",
  "página",
  "url",
];

/** Split one CSV line, honouring double quotes ("a, b" stays one cell). */
function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

/**
 * Read keywords from a CSV or plain list. A header row naming a keyword column
 * (palavra, termo, keyword…) also enables optional group and target page
 * columns; without one, the first column is the keyword. Spreadsheets saved in
 * Brazil use ";", so the separator is whichever of ";" and "," the first line
 * has more of.
 */
export function parseKeywordImport(text: string): KeywordImport {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const first = lines[0] ?? "";
  const separator =
    (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const header = splitLine(first, separator).map((cell) => cell.toLowerCase());
  const keywordColumn = header.findIndex((cell) =>
    KEYWORD_HEADERS.includes(cell),
  );
  const hasHeader = keywordColumn >= 0;
  const groupColumn = hasHeader
    ? header.findIndex((cell) => GROUP_HEADERS.includes(cell))
    : -1;
  const targetColumn = hasHeader
    ? header.findIndex((cell) => TARGET_HEADERS.includes(cell))
    : -1;

  const keywords: ImportedKeyword[] = [];
  const skippedLines: number[] = [];
  lines.forEach((line, index) => {
    if (hasHeader && index === 0) return;
    if (line.trim() === "") return;
    const cells = splitLine(line, separator);
    const keyword = cells[hasHeader ? keywordColumn : 0] ?? "";
    if (keyword === "") {
      skippedLines.push(index + 1);
      return;
    }
    keywords.push({
      keyword,
      group: (groupColumn >= 0 ? cells[groupColumn] : "") || null,
      targetUrl: (targetColumn >= 0 ? cells[targetColumn] : "") || null,
    });
  });
  return { keywords, skippedLines };
}
