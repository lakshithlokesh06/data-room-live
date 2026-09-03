import { isMissingValue } from "@/lib/datasets/profiler";
import type { DataQualityCellType } from "@/lib/data-quality/types";

export function classifyCellValue(value: string): DataQualityCellType {
  const trimmed = value.trim();

  if (isBoolean(trimmed)) {
    return "boolean";
  }

  if (hasLeadingZeroInteger(trimmed)) {
    return "text";
  }

  if (isInteger(trimmed)) {
    return "integer";
  }

  if (isFloat(trimmed)) {
    return "float";
  }

  if (isStrictIsoDate(trimmed)) {
    return "date";
  }

  if (isDateTime(trimmed)) {
    return "datetime";
  }

  return "text";
}

export function typeGroup(type: DataQualityCellType) {
  if (type === "integer" || type === "float") {
    return "numeric";
  }

  if (type === "date" || type === "datetime") {
    return "date";
  }

  return type;
}

export function isRowCompletelyMissing(row: string[]) {
  return row.every(isMissingValue);
}

export function isIdentifierLikeColumn(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalized === "id" ||
    normalized.endsWith("id") ||
    normalized.includes("uuid") ||
    normalized.includes("identifier") ||
    normalized.endsWith("key") ||
    normalized.endsWith("code")
  );
}

export function normalizeCategory(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function looksDateLike(value: string) {
  const trimmed = value.trim();
  return (
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed) ||
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(trimmed)
  );
}

export function isParseableDate(value: string) {
  if (!looksDateLike(value)) {
    return false;
  }

  return Number.isFinite(Date.parse(value.trim()));
}

export function percentage(value: number) {
  return Number((value * 100).toFixed(2));
}

function isBoolean(value: string) {
  return /^(true|false)$/i.test(value);
}

function hasLeadingZeroInteger(value: string) {
  return /^[-+]?0\d+$/.test(value);
}

function isInteger(value: string) {
  return /^[-+]?(0|[1-9]\d*)$/.test(value);
}

function isFloat(value: string) {
  if (hasLeadingZeroInteger(value)) {
    return false;
  }

  return (
    /^[-+]?(?:(?:\d+\.\d+|\d+\.\d*|\.\d+)(?:e[-+]?\d+)?|\d+e[-+]?\d+)$/i.test(
      value
    ) && Number.isFinite(Number(value))
  );
}

function isStrictIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
}

function isDateTime(value: string) {
  return /[tT\s]\d{1,2}:\d{2}/.test(value) && Number.isFinite(Date.parse(value));
}
