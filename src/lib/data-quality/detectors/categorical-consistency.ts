import { CATEGORY_COLLISION_MIN_COUNT } from "@/lib/data-quality/constants";
import type { DataQualityDetector } from "@/lib/data-quality/types";
import { normalizeCategory } from "@/lib/data-quality/value-utils";
import { isMissingValue } from "@/lib/datasets/profiler";

export const categoricalConsistencyDetector: DataQualityDetector = {
  id: "categorical-consistency",
  detect({ profile, rows }) {
    return profile.columns.flatMap((column) => {
      if (column.detectedType !== "string" && column.detectedType !== "boolean") {
        return [];
      }

      const groups = new Map<string, { variants: Set<string>; count: number }>();

      for (const row of rows) {
        const value = row[column.position] ?? "";
        if (isMissingValue(value)) {
          continue;
        }

        const normalized = normalizeCategory(value);
        const group = groups.get(normalized) ?? {
          variants: new Set<string>(),
          count: 0,
        };
        group.variants.add(value);
        group.count += 1;
        groups.set(normalized, group);
      }

      const collisions = Array.from(groups.values()).filter(
        (group) => group.variants.size > 1
      );
      const affectedValueCount = collisions.reduce(
        (sum, group) => sum + group.count,
        0
      );

      if (affectedValueCount < CATEGORY_COLLISION_MIN_COUNT) {
        return [];
      }

      return {
        issueType: "inconsistent_categories",
        title: `Inconsistent category formatting in ${column.name}`,
        description: `${column.name} has ${collisions.length.toLocaleString()} category normalization collision${collisions.length === 1 ? "" : "s"} from case or surrounding whitespace differences.`,
        severity: collisions.length >= 3 ? "medium" : "low",
        columnPosition: column.position,
        metadata: {
          column: column.name,
          normalized_collision_count: collisions.length,
          affected_value_count: affectedValueCount,
        },
        fingerprint: `inconsistent_categories:${column.position}`,
      };
    });
  },
};
