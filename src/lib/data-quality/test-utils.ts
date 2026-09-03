import { profileCsv } from "@/lib/datasets/profiler";
import type { DataQualityDetectionContext } from "@/lib/data-quality/types";

export function createDetectionContext(
  headers: string[],
  rows: string[][],
  rawHeaders: string[] = headers
): DataQualityDetectionContext {
  return {
    headers,
    rawHeaders,
    rows,
    profile: profileCsv(headers, rows),
  };
}
