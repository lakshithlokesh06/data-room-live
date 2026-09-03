import { WHITESPACE_ANOMALY_MIN_RATIO } from "@/lib/data-quality/constants";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import { percentage } from "@/lib/data-quality/value-utils";
import { isMissingValue } from "@/lib/datasets/profiler";

export const whitespaceDetector: DataQualityDetector = {
  id: "whitespace",
  detect({ profile, rows }) {
    return profile.columns.flatMap((column) => {
      if (column.detectedType !== "string") {
        return [];
      }

      const values = rows
        .map((row) => row[column.position] ?? "")
        .filter((value) => !isMissingValue(value));
      const anomalyCount = values.filter(
        (value) => value.length !== value.trim().length
      ).length;
      const ratio = values.length ? anomalyCount / values.length : 0;

      if (anomalyCount === 0 || ratio < WHITESPACE_ANOMALY_MIN_RATIO) {
        return [];
      }

      return {
        issueType: "whitespace_anomaly",
        title: `Leading or trailing whitespace in ${column.name}`,
        description: `${column.name} has ${anomalyCount.toLocaleString()} populated value${anomalyCount === 1 ? "" : "s"} with leading or trailing whitespace.`,
        severity: ratio >= 0.1 ? "medium" : "low",
        columnPosition: column.position,
        metadata: {
          column: column.name,
          affected_value_count: anomalyCount,
          populated_count: values.length,
          affected_percentage: percentage(ratio),
        },
        fingerprint: `whitespace_anomaly:${column.position}`,
      };
    });
  },
};
