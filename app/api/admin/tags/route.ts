import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db, siteSettings } from "@/lib/db";
import { getSiteSettings } from "@/lib/db/queries";
import { marketingSettingsFromRow, parseMarketingTagInput } from "@/lib/marketing/tags";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(marketingSettingsFromRow(getSiteSettings()));
  } catch (error) {
    console.error("Error fetching marketing tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseMarketingTagInput(await request.json());
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const settings = parsed.settings;
    db.update(siteSettings)
      .set({
        gtmContainerId: settings.gtmContainerId || null,
        gtmEnabled: settings.gtmEnabled ? 1 : 0,
        ga4MeasurementId: settings.ga4MeasurementId || null,
        ga4Enabled: settings.ga4Enabled ? 1 : 0,
        googleSiteVerification: settings.googleSiteVerification || null,
        searchConsoleEnabled: settings.searchConsoleEnabled ? 1 : 0,
        clarityProjectId: settings.clarityProjectId || null,
        clarityEnabled: settings.clarityEnabled ? 1 : 0,
        facebookPixelId: settings.facebookPixelId || null,
        facebookPixelEnabled: settings.facebookPixelEnabled ? 1 : 0,
        googleAdsId: settings.googleAdsId || null,
        googleAdsLabel: settings.googleAdsLabel || null,
        googleAdsEnabled: settings.googleAdsEnabled ? 1 : 0,
        updatedAt: new Date(),
      })
      .run();

    revalidatePath("/", "layout");
    revalidatePath("/");

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating marketing tags:", error);
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
  }
}
