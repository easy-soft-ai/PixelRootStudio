import { serveFavicon } from "@/lib/favicon/serve-favicon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return serveFavicon(request);
}
