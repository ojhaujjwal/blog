/**
 * Build version computed once per build. `GITHUB_SHA` is set on GitHub Actions
 * deploys, so every deploy gets a distinct version; local builds fall back to
 * the build timestamp.
 */
const buildVersion = process.env.GITHUB_SHA ?? new Date().toISOString();

/**
 * Build an absolute OG image URL with a cache-busting `v` query param.
 *
 * Social platforms (Discord, Slack, X) cache embed images by their URL, so a
 * changed version forces them to re-fetch the image after each deploy.
 *
 * @param path - The image path or absolute URL, e.g. `/blog/posts/my-post.png`.
 * @param origin - The site origin to resolve relative paths against.
 * @returns The absolute, versioned image URL.
 */
export function buildOgImageUrl(path: string, origin: string | URL): string {
  const url = new URL(path, origin);
  url.searchParams.set("v", buildVersion);
  return url.href;
}
