import { expect, it } from "vitest";
import { parseKeywordImport } from "./keywordImport";

it("reads a Brazilian spreadsheet export with groups, pages and empty rows", () => {
  const csv = [
    "termo;grupo;página alvo",
    "implante dentário;Implantes;/tratamentos/implante",
    ";Implantes;",
    '"aparelho; preço";Ortodontia;',
    "",
  ].join("\r\n");

  expect(parseKeywordImport(csv)).toEqual({
    keywords: [
      {
        keyword: "implante dentário",
        group: "Implantes",
        targetUrl: "/tratamentos/implante",
      },
      { keyword: "aparelho; preço", group: "Ortodontia", targetUrl: null },
    ],
    skippedLines: [3],
  });
});

it("treats a file without a known header as a plain list", () => {
  expect(parseKeywordImport("clareamento\nlente de contato").keywords).toEqual([
    { keyword: "clareamento", group: null, targetUrl: null },
    { keyword: "lente de contato", group: null, targetUrl: null },
  ]);
});
