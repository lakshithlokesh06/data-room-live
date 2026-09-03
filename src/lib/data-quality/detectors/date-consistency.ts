import {
  DATE_CONSISTENCY_DOMINANT_RATIO,
  DATE_CONSISTENCY_MIN_VALUES,
} from "@/lib/data-quality/constants";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import {
  isParseableDate,
  looksDateLike,
  percentage,
} from "@/lib/data-quality/value-utils";
import { isMissingValue } from "@/lib/datasets/profiler";

export const dateConsistencyDetector: DataQualityDetector = {
  id: "date-consistency",
  detect({ profile, rows }) {
    return profile.columns.flatMap((column) => {
      const values = rows
        .map((row) => row[column.position] ?? "")
        .filter((value) => !isMissingValue(value));

      if (values.length < DATE_CONSISTENCY_MIN_VALUES) {
        return [];
      }

      const parseableCount = values.filter(isParseableDate).length;
      const dominantRatio = parseableCount / values.length;

      if (dominantRatio < DATE_CONSISTENCY_DOMINANT_RATIO) {
        return [];
      }

      const invalidCount = values.filter((value) => !isParseableDate(value)).length;
      const dateLikeInvalidCount = values.filter(
        (value) => looksDateLike(value) && !isParseableDate(value)
      ).length;

      if (invalidCount === 0) {
        return [];
      }

      return {
        issueType: "invalid_dates",
        title: `Date parsing inconsistencies in ${column.name}`,
        description: `${column.name} appears date-like in most populated rows, but ${invalidCount.toLocaleString()} value${invalidCount === 1 ? "" : "s"} did not parse consistently.`,
        severity: invalidCount / values.length >= 0.1 ? "medium" : "low",
        columnPosition: column.position,
        metadata: {
          column: column.name,
          populated_count: values.length,
          parseable_date_count: parseableCount,
          invalid_date_count: invalidCount,
          date_like_invalid_count: dateLikeInvalidCount,
          parseable_percentage: percentage(dominantRatio),
        },
        fingerprint: `invalid_dates:${column.position}`,
      };
    });
  },
};
