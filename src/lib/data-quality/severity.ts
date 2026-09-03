import {
  DUPLICATE_ROWS_CRITICAL_RATIO,
  DUPLICATE_ROWS_HIGH_RATIO,
  MISSING_VALUE_CRITICAL_RATIO,
  MISSING_VALUE_HIGH_RATIO,
  MISSING_VALUE_MEDIUM_RATIO,
  MIXED_TYPES_HIGH_RATIO,
  NUMERIC_OUTLIER_HIGH_RATIO,
} from "@/lib/data-quality/constants";
import type { IssueSeverity } from "@/types";

export function severityForMissingRatio(ratio: number): IssueSeverity {
  if (ratio >= MISSING_VALUE_CRITICAL_RATIO) {
    return "critical";
  }

  if (ratio >= MISSING_VALUE_HIGH_RATIO) {
    return "high";
  }

  if (ratio >= MISSING_VALUE_MEDIUM_RATIO) {
    return "medium";
  }

  return "low";
}

export function severityForDuplicateRatio(ratio: number): IssueSeverity {
  if (ratio >= DUPLICATE_ROWS_CRITICAL_RATIO) {
    return "critical";
  }

  if (ratio >= DUPLICATE_ROWS_HIGH_RATIO) {
    return "high";
  }

  return "medium";
}

export function severityForMixedTypeRatio(ratio: number): IssueSeverity {
  return ratio >= MIXED_TYPES_HIGH_RATIO ? "high" : "medium";
}

export function severityForOutlierRatio(ratio: number): IssueSeverity {
  return ratio >= NUMERIC_OUTLIER_HIGH_RATIO ? "high" : "medium";
}
