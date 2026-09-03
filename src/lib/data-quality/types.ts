import type { CsvProfile } from "@/lib/datasets/profiler";
import type {
  DataQualityIssueType,
  IssueSeverity,
  IssueSource,
  IssueStatus,
} from "@/types";

export type DataQualityCellType =
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "text";

export type DataQualityDetectionContext = {
  headers: string[];
  rawHeaders: string[];
  rows: string[][];
  profile: CsvProfile;
};

export type DataQualityDetectionResult = {
  issueType: DataQualityIssueType;
  title: string;
  description: string;
  severity: IssueSeverity;
  columnPosition: number | null;
  metadata: Record<string, number | string | boolean | null>;
  fingerprint: string;
};

export type DataQualityDetector = {
  id: string;
  detect(context: DataQualityDetectionContext): DataQualityDetectionResult[];
};

export type DataQualityEngineResult = {
  issues: DataQualityDetectionResult[];
  failures: {
    detectorId: string;
    message: string;
  }[];
};

export type PersistedQualityIssue = {
  id: string;
  title: string;
  description: string | null;
  issueType: DataQualityIssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  source: IssueSource;
  detectionMetadata: Record<string, unknown> | null;
  columnId: string | null;
  columnName: string | null;
  datasetId: string;
  datasetName: string;
  workspaceId: string;
  createdAt: string;
};
