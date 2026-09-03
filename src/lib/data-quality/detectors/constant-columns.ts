import { CONSTANT_COLUMN_MIN_NON_MISSING } from "@/lib/data-quality/constants";
import type { DataQualityDetector } from "@/lib/data-quality/types";

export const constantColumnsDetector: DataQualityDetector = {
  id: "constant-columns",
  detect({ profile }) {
    return profile.columns.flatMap((column) => {
      const nonMissingCount = profile.rowCount - column.missingCount;

      if (
        nonMissingCount < CONSTANT_COLUMN_MIN_NON_MISSING ||
        column.uniqueCount !== 1
      ) {
        return [];
      }

      return {
        issueType: "constant_column",
        title: `Constant values in ${column.name}`,
        description: `${column.name} has the same non-missing value in every populated row, which can make the column low-information for review.`,
        severity: nonMissingCount === profile.rowCount ? "low" : "medium",
        columnPosition: column.position,
        metadata: {
          column: column.name,
          non_missing_count: nonMissingCount,
          total_rows: profile.rowCount,
        },
        fingerprint: `constant_column:${column.position}`,
      };
    });
  },
};
