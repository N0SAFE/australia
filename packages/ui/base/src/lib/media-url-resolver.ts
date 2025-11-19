/**
 * Type definition for media URL resolver callback
 * @param src - The original source path/URL
 * @returns Promise resolving to the full URL to use for the media
 */
export type MediaUrlResolver = (src: string) => Promise<string> | string

/**
 * Resolves media URLs based on srcUrlId and injected resolver callbacks
 * 
 * Rules:
 * 1. If no srcUrlId: use src as-is (local to current app)
 * 2. If srcUrlId exists: call the resolver callback for that ID with the src
 * 3. If srcUrlId exists but no resolver: use src as-is
 */
export async function resolveMediaUrl(
  src: string,
  srcUrlId: string | null | undefined,
  mediaUrlResolvers: Record<string, MediaUrlResolver> | undefined
): Promise<string> {
  // No src, return empty
  if (!src) return ""

  // Case 1: No srcUrlId - use src as-is
  if (!srcUrlId) {
    return src
  }

  // Case 2: srcUrlId exists - use resolver callback
  const resolver = mediaUrlResolvers?.[srcUrlId]
  if (resolver) {
    try {
      return await resolver(src)
    } catch (error) {
      console.error(`Failed to resolve media URL for srcUrlId "${srcUrlId}":`, error)
      return src // Fallback to original src on error
    }
  }

  // Case 3: srcUrlId exists but no resolver - use src as-is
  return src
}
