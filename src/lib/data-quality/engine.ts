import { highCardinalityDetector } from "@/lib/data-quality/detectors/cardinality";
import { categoricalConsistencyDetector } from "@/lib/data-quality/detectors/categorical-consistency";
import { columnNamesDetector } from "@/lib/data-quality/detectors/column-names";
import { constantColumnsDetector } from "@/lib/data-quality/detectors/constant-columns";
import { dateConsistencyDetector } from "@/lib/data-quality/detectors/date-consistency";
import { duplicateRowsDetector } from "@/lib/data-quality/detectors/duplicates";
import { missingValuesDetector } from "@/lib/data-quality/detectors/missing-values";
import { numericOutliersDetector } from "@/lib/data-quality/detectors/outliers";
import { typeConsistencyDetector } from "@/lib/data-quality/detectors/type-consistency";
import { whitespaceDetector } from "@/lib/data-quality/detectors/whitespace";
import type {
  DataQualityDetectionContext,
  DataQualityDetector,
  DataQualityEngineResult,
} from "@/lib/data-quality/types";

export const dataQualityDetectors: DataQualityDetector[] = [
  columnNamesDetector,
  missingValuesDetector,
  duplicateRowsDetector,
  constantColumnsDetector,
  highCardinalityDetector,
  typeConsistencyDetector,
  numericOutliersDetector,
  categoricalConsistencyDetector,
  dateConsistencyDetector,
  whitespaceDetector,
];

export function runDataQualityDetection(
  context: DataQualityDetectionContext,
  detectors: DataQualityDetector[] = dataQualityDetectors
): DataQualityEngineResult {
  const result: DataQualityEngineResult = {
    issues: [],
    failures: [],
  };

  for (const detector of detectors) {
    try {
      result.issues.push(...detector.detect(context));
    } catch (error) {
      result.failures.push({
        detectorId: detector.id,
        message:
          error instanceof Error
            ? error.message
            : "Detector failed unexpectedly.",
      });
    }
  }

  return result;
}
