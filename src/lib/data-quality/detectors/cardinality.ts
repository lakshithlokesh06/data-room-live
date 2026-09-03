import {
  HIGH_CARDINALITY_MIN_RATIO,
  HIGH_CARDINALITY_MIN_ROWS,
  HIGH_CARDINALITY_MIN_UNIQUE,
} from "@/lib/data-quality/constants";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import {
  isIdentifierLikeColumn,
  percentage,
} from "@/lib/data-quality/value-utils";

export const highCardinalityDetector: DataQualityDetector = {
  id: "high-cardinality",
  detect({ profile }) {
    if (profile.rowCount < HIGH_CARDINALITY_MIN_ROWS) {
      return [];
    }

    return profile.columns.flatMap((column) => {
      const nonMissingCount = profile.rowCount - column.missingCount;
      const uniqueRatio = nonMissingCount
        ? column.uniqueCount / nonMissingCount
        : 0;

      if (
        column.detectedType !== "string" ||
        column.uniqueCount < HIGH_CARDINALITY_MIN_UNIQUE ||
        uniqueRatio < HIGH_CARDINALITY_MIN_RATIO ||
        isIdentifierLikeColumn(column.name)
      ) {
        return [];
      }

      return {
        issueType: "high_cardinality",
        title: `High-cardinality values in ${column.name}`,
        description: `${column.name} has ${column.uniqueCount.toLocaleString()} unique values across ${nonMissingCount.toLocaleString()} populated rows (${percentage(uniqueRatio)}%).`,
        severity: uniqueRatio >= 0.95 ? "medium" : "low",
        columnPosition: column.position,
        metadata: {
          column: column.name,
          unique_count: column.uniqueCount,
          non_missing_count: nonMissingCount,
          uniqueness_percentage: percentage(uniqueRatio),
          identifier_like_suppressed: false,
        },
        fingerprint: `high_cardinality:${column.position}`,
      };
    });
  },
};
