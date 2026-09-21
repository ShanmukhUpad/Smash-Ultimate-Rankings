/**
 * Base path for the deployed site.
 *
 * GitHub Pages serves a project site from /<repo>, so every absolute asset URL
 * needs that prefix. Next rewrites next/link and next/image for you, but not a
 * raw <img src="/icons/x.png">, and this project uses plain img tags for the
 * 200px stock portraits. Everything that builds an absolute asset URL goes
 * through asset() so one env var moves the whole site.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
