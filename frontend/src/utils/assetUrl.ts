export function assetUrl(path: string | undefined | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL || "http://localhost:3000";
  return `${api}${path.startsWith("/") ? path : `/${path}`}`;
}
