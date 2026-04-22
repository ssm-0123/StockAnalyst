const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

export function withBasePath(url: string) {
  if (!basePath || !url.startsWith("/")) {
    return url;
  }

  return `${basePath}${url}`;
}
