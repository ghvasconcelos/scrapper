export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Who is using the CRM right now (no login: picked in the sidebar, sent on every request). */
export function author(req: Request): string {
  return decodeURIComponent(req.headers.get("x-crm-user") || "");
}
