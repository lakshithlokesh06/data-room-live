import { NextResponse } from "next/server";

import { createDatasetDownloadUrl } from "@/lib/datasets/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  const { datasetId } = await params;
  const result = await createDatasetDownloadUrl(datasetId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status }
    );
  }

  return NextResponse.redirect(result.signedUrl);
}
