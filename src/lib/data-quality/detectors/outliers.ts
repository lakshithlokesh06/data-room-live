import {
  NUMERIC_OUTLIER_MIN_SAMPLE_SIZE,
} from "@/lib/data-quality/constants";
import { severityForOutlierRatio } from "@/lib/data-quality/severity";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import { percentage } from "@/lib/data-quality/value-utils";
import { isMissingValue } from "@/lib/datasets/profiler";

export const numericOutliersDetector: DataQualityDetector = {
  id: "numeric-outliers",
  detect({ profile, rows }) {
    return profile.columns.flatMap((column) => {
      if (column.detectedType !== "integer" && column.detectedType !== "float") {
        return [];
      }

      const values = rows
        .map((row) => row[column.position] ?? "")
        .filter((value) => !isMissingValue(value))
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

      if (values.length < NUMERIC_OUTLIER_MIN_SAMPLE_SIZE) {
        return [];
      }

      const q1 = quantile(values, 0.25);
      const q3 = quantile(values, 0.75);
      const iqr = q3 - q1;

      if (iqr === 0) {
        return [];
      }

      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      const outlierCount = values.filter(
        (value) => value < lowerFence || value > upperFence
      ).length;

      if (outlierCount === 0) {
        return [];
      }

      const ratio = outlierCount / values.length;

      return {
        issueType: "numeric_outliers",
        title: `Possible numeric outliers detected in ${column.name}`,
        description: `${column.name} has ${outlierCount.toLocaleString()} value${outlierCount === 1 ? "" : "s"} outside the IQR fence. Outliers are review signals, not automatically invalid values.`,
        severity: severityForOutlierRatio(ratio),
        columnPosition: column.position,
        metadata: {
          column: column.name,
          method: "IQR",
          sample_count: values.length,
          outlier_count: outlierCount,
          outlier_percentage: percentage(ratio),
          q1: round(q1),
          q3: round(q3),
          iqr: round(iqr),
          lower_fence: round(lowerFence),
          upper_fence: round(upperFence),
        },
        fingerprint: `numeric_outliers:${column.position}`,
      };
    });
  },
};

function quantile(values: number[], percentile: number) {
  const index = (values.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return values[lower];
  }

  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function round(value: number) {
  return Number(value.toFixed(4));
}
