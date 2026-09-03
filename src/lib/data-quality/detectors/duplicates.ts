import {
  DUPLICATE_ROWS_MIN_RATIO,
} from "@/lib/data-quality/constants";
import { severityForDuplicateRatio } from "@/lib/data-quality/severity";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import { isRowCompletelyMissing, percentage } from "@/lib/data-quality/value-utils";

export const duplicateRowsDetector: DataQualityDetector = {
  id: "duplicate-rows",
  detect({ rows }) {
    const dataRows = rows.filter((row) => !isRowCompletelyMissing(row));
    const totalRows = dataRows.length;

    if (totalRows === 0) {
      return [];
    }

    const seen = new Map<string, number>();
    let duplicateCount = 0;

    for (const row of dataRows) {
      const key = JSON.stringify(row);
      const count = seen.get(key) ?? 0;

      if (count > 0) {
        duplicateCount += 1;
      }

      seen.set(key, count + 1);
    }

    const duplicateRatio = duplicateCount / totalRows;

    if (duplicateCount === 0 || duplicateRatio < DUPLICATE_ROWS_MIN_RATIO) {
      return [];
    }

    return [
      {
        issueType: "duplicate_rows",
        title: "Duplicate rows detected",
        description: `${duplicateCount.toLocaleString()} duplicate row${duplicateCount === 1 ? "" : "s"} detected across ${totalRows.toLocaleString()} data rows (${percentage(duplicateRatio)}%).`,
        severity: severityForDuplicateRatio(duplicateRatio),
        columnPosition: null,
        metadata: {
          duplicate_row_count: duplicateCount,
          total_rows: totalRows,
          duplicate_ratio: Number(duplicateRatio.toFixed(4)),
          duplicate_percentage: percentage(duplicateRatio),
        },
        fingerprint: "duplicate_rows",
      },
    ];
  },
};
