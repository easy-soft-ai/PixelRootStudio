import { NextResponse } from "next/server";
import { getSiteSeo } from "@/lib/db/queries";
import { readUploadFile } from "@/lib/uploads/serve-file";

export const dynamic = "force-dynamic";

function uploadSegmentsFromPath(faviconPath: string): string[] | null {
  const normalized = faviconPath.replace(/^\//, "");
  if (!normalized.startsWith("uploads/")) return null;
  return normalized.slice("uploads/".length).split("/");
}

export async function serveFavicon(request: Request) {
  const { favicon } = getSiteSeo();

  if (!favicon) {
    return new NextResponse(null, { status: 404 });
  }

  if (favicon.startsWith("http://") || favicon.startsWith("https://")) {
    return NextResponse.redirect(favicon);
  }

  const segments = uploadSegmentsFromPath(favicon);
  if (segments) {
    const file = await readUploadFile(segments);
    if (file) {
      return new NextResponse(file.body, {
        headers: {
          "Content-Type": file.contentType,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }
  }

  return NextResponse.redirect(new URL(favicon, request.url));
}
