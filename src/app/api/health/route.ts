export function GET() {
  return Response.json({
    ok: true,
    service: "dataroom-live",
    scope: "foundation",
  });
}
