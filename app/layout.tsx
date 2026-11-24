import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ChromeGate } from "@/components/chrome-gate";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { SiteFooter } from "@/components/site-footer";
import { getSiteSeo } from "@/seo/site-seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const revalidate = 3600;

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0f1115",
};

export async function generateMetadata(): Promise<Metadata> {
  const siteSeo = getSiteSeo();
  const ogImages = siteSeo.ogImage
    ? [{ url: siteSeo.ogImage, width: 1200, height: 630, alt: siteSeo.siteName }]
    : undefined;

  return {
    metadataBase: new URL(siteSeo.siteUrl),
    title: siteSeo.title,
    description: siteSeo.description,
    keywords: siteSeo.keywords,
    applicationName: siteSeo.siteName,
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: siteSeo.locale,
      url: siteSeo.siteUrl,
      title: siteSeo.title,
      description: siteSeo.description,
      siteName: siteSeo.siteName,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: siteSeo.title,
      description: siteSeo.description,
      creator: siteSeo.twitterHandle,
      site: siteSeo.twitterHandle,
      images: siteSeo.ogImage ? [siteSeo.ogImage] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <head>
        <DynamicFavicon />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <AppShell>
          <main className="site-main">{children}</main>
          <ChromeGate>
            <SiteFooter />
          </ChromeGate>
        </AppShell>
      </body>
    </html>
  );
}
