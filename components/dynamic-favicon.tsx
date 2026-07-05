import { getSiteSeo } from "@/seo/site-seo";

export function DynamicFavicon() {
  const { favicon } = getSiteSeo();
  if (!favicon) return null;

  const href = favicon.startsWith("http")
    ? favicon
    : `/api/favicon?v=${encodeURIComponent(favicon)}`;

  return (
    <>
      <link rel="icon" href={href} type="image/png" sizes="any" />
      <link rel="shortcut icon" href={href} />
      <link rel="apple-touch-icon" href={href} />
    </>
  );
}
