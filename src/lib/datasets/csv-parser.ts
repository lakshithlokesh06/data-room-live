import { parse } from "csv-parse/sync";

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

export type ParsedCsv = {
  rawHeaders: string[];
  headers: string[];
  rows: string[][];
};

export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  let records: string[][];

  try {
    records = parse(buffer.toString("utf8"), {
      bom: true,
      skip_empty_lines: true,
      trim: false,
      relax_column_count: false,
    }) as string[][];
  } catch (error) {
    throw new CsvParseError(
      error instanceof Error ? error.message : "The CSV could not be parsed."
    );
  }

  if (records.length === 0) {
    throw new CsvParseError("The CSV is empty.");
  }

  const rawHeaders = records[0].map((header) => String(header));
  const headers = rawHeaders.map((header, index) => {
    const trimmedHeader = header.trim();
    return trimmedHeader || `Unnamed column ${index + 1}`;
  });

  if (headers.length === 0) {
    throw new CsvParseError("The CSV must include a header row.");
  }

  const duplicate = findDuplicateHeader(headers);
  if (duplicate) {
    throw new CsvParseError(`Duplicate column name: ${duplicate}`);
  }

  const blankHeaderIndex = headers.findIndex((header) => header.length === 0);
  if (blankHeaderIndex >= 0) {
    throw new CsvParseError(
      `Column ${blankHeaderIndex + 1} is missing a header name.`
    );
  }

  return {
    rawHeaders,
    headers,
    rows: records.slice(1).map((row) => row.map((value) => String(value))),
  };
}

function findDuplicateHeader(headers: string[]) {
  const seen = new Set<string>();

  for (const header of headers) {
    const key = header.toLowerCase();
    if (seen.has(key)) {
      return header;
    }
    seen.add(key);
  }

  return null;
}
