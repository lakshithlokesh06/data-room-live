import {
  MISSING_VALUE_ISSUE_MIN_RATIO,
} from "@/lib/data-quality/constants";
import { severityForMissingRatio } from "@/lib/data-quality/severity";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import { percentage } from "@/lib/data-quality/value-utils";

export const missingValuesDetector: DataQualityDetector = {
  id: "missing-values",
  detect({ profile }) {
    if (profile.rowCount === 0) {
      return [];
    }

    return profile.columns.flatMap((column) => {
      const ratio = column.missingCount / profile.rowCount;

      if (ratio < MISSING_VALUE_ISSUE_MIN_RATIO) {
        return [];
      }

      const missingPercentage = percentage(ratio);

      return {
        issueType: "missing_values",
        title: `Missing values in ${column.name}`,
        description: `${column.name} has ${column.missingCount.toLocaleString()} missing value${column.missingCount === 1 ? "" : "s"} across ${profile.rowCount.toLocaleString()} rows (${missingPercentage}%).`,
        severity: severityForMissingRatio(ratio),
        columnPosition: column.position,
        metadata: {
          column: column.name,
          missing_count: column.missingCount,
          total_rows: profile.rowCount,
          missing_percentage: missingPercentage,
        },
        fingerprint: `missing_values:${column.position}`,
      };
    });
  },
};
