"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GoogleTagManager } from "@next/third-parties/google";
import type { PublicMarketingTags } from "@/lib/marketing/tags";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

export function MarketingScripts({ tags }: { tags: PublicMarketingTags }) {
  const pathname = usePathname();
  const skip = pathname.startsWith("/admin");
  const firstView = useRef(true);

  useEffect(() => {
    if (skip) return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }

    const analytics = window as AnalyticsWindow;
    if (analytics.gtag) {
      if (tags.ga4Id) analytics.gtag("config", tags.ga4Id, { page_path: pathname });
      if (tags.googleAdsId) analytics.gtag("config", tags.googleAdsId, { page_path: pathname });
    }
    if (analytics.fbq) analytics.fbq("track", "PageView");
  }, [pathname, skip, tags.ga4Id, tags.googleAdsId]);

  if (skip) return null;

  const primaryGtagId = tags.ga4Id || tags.googleAdsId;
  const extraAdsConfig = tags.ga4Id && tags.googleAdsId ? `gtag('config','${tags.googleAdsId}');` : "";
  const adsConversion =
    tags.googleAdsId && tags.googleAdsLabel
      ? `gtag('event','conversion',{send_to:'${tags.googleAdsId}/${tags.googleAdsLabel}'});`
      : "";

  return (
    <>
      {tags.gtmId && (
        <>
          <GoogleTagManager gtmId={tags.gtmId} />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${tags.gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      )}

      {primaryGtagId && <GoogleAnalytics gaId={primaryGtagId} />}

      {(extraAdsConfig || adsConversion) && (
        <Script id="google-ads-config" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments);};${extraAdsConfig}${adsConversion}`}
        </Script>
      )}

      {tags.clarityId && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${tags.clarityId}");`}
        </Script>
      )}

      {tags.facebookPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${tags.facebookPixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${tags.facebookPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}
    </>
  );
}
