import { getSiteSettings } from "@/lib/db/queries";

export type MarketingTagSettings = {
  gtmContainerId: string;
  gtmEnabled: boolean;
  ga4MeasurementId: string;
  ga4Enabled: boolean;
  googleSiteVerification: string;
  searchConsoleEnabled: boolean;
  clarityProjectId: string;
  clarityEnabled: boolean;
  facebookPixelId: string;
  facebookPixelEnabled: boolean;
  googleAdsId: string;
  googleAdsLabel: string;
  googleAdsEnabled: boolean;
};

export type PublicMarketingTags = {
  gtmId: string | null;
  ga4Id: string | null;
  googleSiteVerification: string | null;
  clarityId: string | null;
  facebookPixelId: string | null;
  googleAdsId: string | null;
  googleAdsLabel: string | null;
};

const GTM = /^GTM-[A-Z0-9]+$/i;
const GA4 = /^G-[A-Z0-9]+$/i;
const VERIFICATION = /^[A-Za-z0-9_-]{8,200}$/;
const CLARITY = /^[a-z0-9]{6,32}$/i;
const FACEBOOK = /^\d{5,20}$/;
const GOOGLE_ADS = /^AW-\d{5,20}$/i;
const ADS_LABEL = /^[A-Za-z0-9_-]{1,64}$/;

export const emptyMarketingTagSettings = (): MarketingTagSettings => ({
  gtmContainerId: "",
  gtmEnabled: false,
  ga4MeasurementId: "",
  ga4Enabled: false,
  googleSiteVerification: "",
  searchConsoleEnabled: false,
  clarityProjectId: "",
  clarityEnabled: false,
  facebookPixelId: "",
  facebookPixelEnabled: false,
  googleAdsId: "",
  googleAdsLabel: "",
  googleAdsEnabled: false,
});

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSiteVerification(raw: string): string {
  const trimmed = raw.trim();
  const fromMeta = trimmed.match(/content\s*=\s*["']([^"']+)["']/i);
  return (fromMeta?.[1] || trimmed).trim();
}

type TagRow = {
  [K in keyof MarketingTagSettings]?: MarketingTagSettings[K] | number | null;
};

export function marketingSettingsFromRow(row: TagRow | null): MarketingTagSettings {
  if (!row) return emptyMarketingTagSettings();
  return {
    gtmContainerId: text(row.gtmContainerId),
    gtmEnabled: asBool(row.gtmEnabled),
    ga4MeasurementId: text(row.ga4MeasurementId),
    ga4Enabled: asBool(row.ga4Enabled),
    googleSiteVerification: text(row.googleSiteVerification),
    searchConsoleEnabled: asBool(row.searchConsoleEnabled),
    clarityProjectId: text(row.clarityProjectId),
    clarityEnabled: asBool(row.clarityEnabled),
    facebookPixelId: text(row.facebookPixelId),
    facebookPixelEnabled: asBool(row.facebookPixelEnabled),
    googleAdsId: text(row.googleAdsId),
    googleAdsLabel: text(row.googleAdsLabel),
    googleAdsEnabled: asBool(row.googleAdsEnabled),
  };
}

export function parseMarketingTagInput(body: unknown): { settings: MarketingTagSettings } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid settings" };
  }
  const raw = body as Record<string, unknown>;
  const settings: MarketingTagSettings = {
    gtmContainerId: text(raw.gtmContainerId).toUpperCase(),
    gtmEnabled: asBool(raw.gtmEnabled),
    ga4MeasurementId: text(raw.ga4MeasurementId).toUpperCase(),
    ga4Enabled: asBool(raw.ga4Enabled),
    googleSiteVerification: normalizeSiteVerification(text(raw.googleSiteVerification)),
    searchConsoleEnabled: asBool(raw.searchConsoleEnabled),
    clarityProjectId: text(raw.clarityProjectId),
    clarityEnabled: asBool(raw.clarityEnabled),
    facebookPixelId: text(raw.facebookPixelId),
    facebookPixelEnabled: asBool(raw.facebookPixelEnabled),
    googleAdsId: text(raw.googleAdsId).toUpperCase(),
    googleAdsLabel: text(raw.googleAdsLabel),
    googleAdsEnabled: asBool(raw.googleAdsEnabled),
  };

  const checks: [boolean, string, RegExp, string][] = [
    [settings.gtmEnabled, settings.gtmContainerId, GTM, "Google Tag Manager ID must look like GTM-XXXXXXX"],
    [settings.ga4Enabled, settings.ga4MeasurementId, GA4, "Google Analytics ID must look like G-XXXXXXXX"],
    [settings.searchConsoleEnabled, settings.googleSiteVerification, VERIFICATION, "Search Console verification code is not valid. Paste the content value from the HTML tag."],
    [settings.clarityEnabled, settings.clarityProjectId, CLARITY, "Clarity project ID is not valid"],
    [settings.facebookPixelEnabled, settings.facebookPixelId, FACEBOOK, "Meta Pixel ID must be numbers only"],
    [settings.googleAdsEnabled, settings.googleAdsId, GOOGLE_ADS, "Google Ads ID must look like AW-XXXXXXXXX"],
  ];

  for (const [enabled, value, pattern, message] of checks) {
    if (!value) {
      if (enabled) return { error: message };
      continue;
    }
    if (!pattern.test(value)) return { error: message };
  }

  if (settings.googleAdsLabel && !ADS_LABEL.test(settings.googleAdsLabel)) {
    return { error: "Google Ads conversion label can only use letters, numbers, hyphens, and underscores" };
  }

  return { settings };
}

function enabledId(enabled: boolean, value: string | null | undefined, pattern: RegExp, transform?: (value: string) => string): string | null {
  const next = transform ? transform(value || "") : (value || "").trim();
  if (!enabled || !pattern.test(next)) return null;
  return next;
}

export function toPublicMarketingTags(settings: MarketingTagSettings): PublicMarketingTags {
  const adsId = enabledId(settings.googleAdsEnabled, settings.googleAdsId, GOOGLE_ADS, (value) => value.toUpperCase());
  const label = settings.googleAdsLabel.trim();
  return {
    gtmId: enabledId(settings.gtmEnabled, settings.gtmContainerId, GTM, (value) => value.toUpperCase()),
    ga4Id: enabledId(settings.ga4Enabled, settings.ga4MeasurementId, GA4, (value) => value.toUpperCase()),
    googleSiteVerification: enabledId(settings.searchConsoleEnabled, settings.googleSiteVerification, VERIFICATION),
    clarityId: enabledId(settings.clarityEnabled, settings.clarityProjectId, CLARITY),
    facebookPixelId: enabledId(settings.facebookPixelEnabled, settings.facebookPixelId, FACEBOOK),
    googleAdsId: adsId,
    googleAdsLabel: adsId && ADS_LABEL.test(label) ? label : null,
  };
}

export function getPublicMarketingTags(): PublicMarketingTags {
  const row = getSiteSettings();
  return toPublicMarketingTags(marketingSettingsFromRow(row));
}
