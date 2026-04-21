const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
export const liveQuotesEnabled = process.env.NEXT_PUBLIC_ENABLE_LIVE_QUOTES === "true";

export function withBasePath(url: string) {
  if (!basePath) {
    return url;
  }

  if (!url.startsWith("/")) {
    return url;
  }

  return `${basePath}${url}`;
}
