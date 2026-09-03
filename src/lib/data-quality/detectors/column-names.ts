import type { DataQualityDetector } from "@/lib/data-quality/types";

export const columnNamesDetector: DataQualityDetector = {
  id: "column-names",
  detect({ headers, rawHeaders }) {
    return rawHeaders.flatMap((rawHeader, position) => {
      const trimmed = rawHeader.trim();
      const generatedName = headers[position] ?? `Column ${position + 1}`;

      if (trimmed.length > 0 && !isGeneratedUnnamedHeader(trimmed)) {
        return [];
      }

      return {
        issueType: "unnamed_column",
        title: `Unnamed column at position ${position + 1}`,
        description: `${generatedName} does not have a clear source header. Rename the column upstream before review.`,
        severity: "medium",
        columnPosition: position,
        metadata: {
          column: generatedName,
          position: position + 1,
          original_header_blank: trimmed.length === 0,
        },
        fingerprint: `unnamed_column:${position}`,
      };
    });
  },
};

function isGeneratedUnnamedHeader(header: string) {
  return /^(unnamed|column)(?:[:_\-\s]*\d+)?$/i.test(header);
}
