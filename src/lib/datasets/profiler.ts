import { MISSING_VALUE_TOKENS } from "@/lib/datasets/constants";

export const detectedColumnTypes = [
  "integer",
  "float",
  "boolean",
  "date",
  "datetime",
  "string",
] as const;

export type DetectedColumnType = (typeof detectedColumnTypes)[number];

export type ProfiledColumn = {
  name: string;
  position: number;
  detectedType: DetectedColumnType;
  nullable: boolean;
  missingCount: number;
  uniqueCount: number;
};

export type CsvProfile = {
  rowCount: number;
  columnCount: number;
  columns: ProfiledColumn[];
};

export function profileCsv(headers: string[], rows: string[][]): CsvProfile {
  return {
    rowCount: rows.length,
    columnCount: headers.length,
    columns: headers.map((header, position) => {
      const values = rows.map((row) => row[position] ?? "");
      const nonMissingValues = values.filter((value) => !isMissingValue(value));
      const missingCount = values.length - nonMissingValues.length;

      return {
        name: header,
        position,
        detectedType: inferColumnType(nonMissingValues),
        nullable: missingCount > 0,
        missingCount,
        uniqueCount: new Set(nonMissingValues.map((value) => value.trim()))
          .size,
      };
    }),
  };
}

export function isMissingValue(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  return MISSING_VALUE_TOKENS.has(String(value).trim().toLowerCase());
}

export function inferColumnType(values: string[]): DetectedColumnType {
  if (values.length === 0) {
    return "string";
  }

  if (values.every(isBoolean)) {
    return "boolean";
  }

  if (values.some(hasLeadingZeroInteger)) {
    return "string";
  }

  if (values.every(isInteger)) {
    return "integer";
  }

  if (values.every(isFloat)) {
    return "float";
  }

  if (values.every(isIsoDate)) {
    return "date";
  }

  if (values.every(isDateTime)) {
    return "datetime";
  }

  return "string";
}

function isBoolean(value: string) {
  return /^(true|false)$/i.test(value.trim());
}

function hasLeadingZeroInteger(value: string) {
  return /^[-+]?0\d+$/.test(value.trim());
}

function isInteger(value: string) {
  return /^[-+]?(0|[1-9]\d*)$/.test(value.trim());
}

function isFloat(value: string) {
  const trimmed = value.trim();
  if (hasLeadingZeroInteger(trimmed)) {
    return false;
  }

  return (
    /^[-+]?(?:\d+\.\d+|\d+\.\d*|\.\d+|\d+e[-+]?\d+|\d+\.\d+e[-+]?\d+)$/i.test(
      trimmed
    ) && Number.isFinite(Number(trimmed))
  );
}

function isIsoDate(value: string) {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (!match) {
    return false;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
}

function isDateTime(value: string) {
  const trimmed = value.trim();

  if (!/[tT\s]\d{1,2}:\d{2}/.test(trimmed)) {
    return false;
  }

  const time = Date.parse(trimmed);
  return Number.isFinite(time);
}
