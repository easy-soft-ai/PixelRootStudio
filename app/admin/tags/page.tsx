"use client";

import { useEffect, useState } from "react";
import type { MarketingTagSettings } from "@/lib/marketing/tags";

const inputClass =
  "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/50";

type FieldKey = keyof MarketingTagSettings;

const tools: {
  title: string;
  purpose: string;
  enabled: FieldKey;
  id: FieldKey;
  placeholder: string;
  hint: string;
  extra?: { key: FieldKey; label: string; placeholder: string; hint: string };
}[] = [
  {
    title: "Google Tag Manager",
    purpose: "One container that can load your other marketing scripts.",
    enabled: "gtmEnabled",
    id: "gtmContainerId",
    placeholder: "GTM-XXXXXXX",
    hint: "Container ID from Tag Manager.",
  },
  {
    title: "Google Analytics 4",
    purpose: "Traffic and conversion reports.",
    enabled: "ga4Enabled",
    id: "ga4MeasurementId",
    placeholder: "G-XXXXXXXX",
    hint: "Measurement ID from Analytics.",
  },
  {
    title: "Google Search Console",
    purpose: "Proves this site to Google so you can see organic search queries.",
    enabled: "searchConsoleEnabled",
    id: "googleSiteVerification",
    placeholder: "verification code",
    hint: "Paste the content value from the HTML tag method, not the whole meta tag.",
  },
  {
    title: "Microsoft Clarity",
    purpose: "Heatmaps and session recordings.",
    enabled: "clarityEnabled",
    id: "clarityProjectId",
    placeholder: "project id",
    hint: "Project ID from the Clarity setup snippet.",
  },
  {
    title: "Meta Pixel",
    purpose: "Paid ads and retargeting on Facebook and Instagram.",
    enabled: "facebookPixelEnabled",
    id: "facebookPixelId",
    placeholder: "1234567890",
    hint: "Numeric pixel ID from Meta Events Manager.",
  },
  {
    title: "Google Ads",
    purpose: "Paid ads and retargeting on Google.",
    enabled: "googleAdsEnabled",
    id: "googleAdsId",
    placeholder: "AW-XXXXXXXXX",
    hint: "Conversion ID. Leave the label blank unless every public page view should count as a conversion.",
    extra: {
      key: "googleAdsLabel",
      label: "Conversion label (optional)",
      placeholder: "AbC123",
      hint: "If set, a conversion event is sent on each public page view.",
    },
  },
];

export default function AdminTagsPage() {
  const [data, setData] = useState<MarketingTagSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((res) => res.json())
      .then((raw) => {
        if (raw.error) {
          setError(raw.error);
          setLoading(false);
          return;
        }
        setData(raw);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load tags");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (res.ok) {
        setData(body.settings);
        setMessage("Tags saved.");
      } else {
        setError(body.error || "Failed to save tags");
      }
    } catch {
      setError("An error occurred");
    }

    setSaving(false);
  }

  if (loading) {
    return <div className="text-white/50">Loading...</div>;
  }

  if (!data) {
    return <div className="text-red-400">{error || "Failed to load tags"}</div>;
  }

  const gtmOverlap =
    data.gtmEnabled &&
    (data.ga4Enabled || data.clarityEnabled || data.facebookPixelEnabled || data.googleAdsEnabled);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">SEO & Tags</h1>
          <p className="text-sm text-white/50 mt-1">
            Free marketing tools. Each one stays off until you add a valid ID and turn it on.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-[color:var(--primary)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-lg transition-opacity shrink-0"
        >
          {saving ? "Saving..." : "Save Tags"}
        </button>
      </div>

      {gtmOverlap && (
        <p className="mb-6 rounded-xl border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/10 px-4 py-3 text-sm text-white/80">
          Tag Manager is on together with another script. If that tool is already installed inside Tag Manager, turn its switch off here so visits are not counted twice. Search Console can stay on.
        </p>
      )}

      {message && <p className="mb-4 text-sm text-emerald-400">{message}</p>}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="space-y-4">
        {tools.map((tool) => {
          const enabled = Boolean(data[tool.enabled]);
          return (
            <section key={tool.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">{tool.title}</h2>
                  <p className="mt-1 text-sm text-white/50">{tool.purpose}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${enabled ? "Disable" : "Enable"} ${tool.title}`}
                  onClick={() => setData({ ...data, [tool.enabled]: !enabled })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-[color:var(--primary)]" : "bg-white/15"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
              <label className="mt-4 block">
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40">ID</span>
                <input
                  value={String(data[tool.id] ?? "")}
                  onChange={(event) => setData({ ...data, [tool.id]: event.target.value })}
                  placeholder={tool.placeholder}
                  className={`${inputClass} mt-1.5`}
                  spellCheck={false}
                  autoComplete="off"
                />
                <span className="mt-1.5 block text-xs text-white/40">{tool.hint}</span>
              </label>
              {tool.extra && (
                <label className="mt-4 block">
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40">{tool.extra.label}</span>
                  <input
                    value={String(data[tool.extra.key] ?? "")}
                    onChange={(event) => setData({ ...data, [tool.extra!.key]: event.target.value })}
                    placeholder={tool.extra.placeholder}
                    className={`${inputClass} mt-1.5`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <span className="mt-1.5 block text-xs text-white/40">{tool.extra.hint}</span>
                </label>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
