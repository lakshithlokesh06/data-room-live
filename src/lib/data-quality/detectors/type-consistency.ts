import {
  MIXED_TYPES_MIN_RATIO,
} from "@/lib/data-quality/constants";
import { severityForMixedTypeRatio } from "@/lib/data-quality/severity";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import {
  classifyCellValue,
  percentage,
  typeGroup,
} from "@/lib/data-quality/value-utils";
import { isMissingValue } from "@/lib/datasets/profiler";

export const typeConsistencyDetector: DataQualityDetector = {
  id: "type-consistency",
  detect({ profile, rows }) {
    return profile.columns.flatMap((column) => {
      const values = rows
        .map((row) => row[column.position] ?? "")
        .filter((value) => !isMissingValue(value));

      if (values.length === 0) {
        return [];
      }

      const groups = values.map((value) => typeGroup(classifyCellValue(value)));
      const groupCounts = groups.reduce<Record<string, number>>((counts, group) => {
        counts[group] = (counts[group] ?? 0) + 1;
        return counts;
      }, {});
      const [expectedGroup, expectedCount] = Object.entries(groupCounts).sort(
        (a, b) => b[1] - a[1]
      )[0];

      if (!expectedGroup || expectedGroup === "text" || expectedCount < 2) {
        return [];
      }

      const inconsistentCount = values.filter(
        (value) => typeGroup(classifyCellValue(value)) !== expectedGroup
      ).length;
      const inconsistentRatio = inconsistentCount / values.length;

      if (
        inconsistentCount === 0 ||
        inconsistentRatio < MIXED_TYPES_MIN_RATIO
      ) {
        return [];
      }

      return {
        issueType: "mixed_types",
        title: `Mixed value types in ${column.name}`,
        description: `${column.name} is mostly ${expectedGroup}, but ${inconsistentCount.toLocaleString()} populated value${inconsistentCount === 1 ? "" : "s"} do not match that representation (${percentage(inconsistentRatio)}%).`,
        severity: severityForMixedTypeRatio(inconsistentRatio),
        columnPosition: column.position,
        metadata: {
          column: column.name,
          expected_type: expectedGroup,
          inconsistent_count: inconsistentCount,
          populated_count: values.length,
          inconsistent_percentage: percentage(inconsistentRatio),
        },
        fingerprint: `mixed_types:${column.position}`,
      };
    });
  },
};
