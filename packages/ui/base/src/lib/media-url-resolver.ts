/**
 * Type definition for media URL resolver callback
 * @param src - The original source path/URL or contentMediaId
 * @returns Promise resolving to the full URL to use for the media
 */
export type MediaUrlResolver = (src: string) => Promise<string> | string

/**
 * Resolves media URLs based on meta information and injected resolver callbacks
 * 
 * Rules:
 * 1. If meta.strategy is 'contentMediaId': use contentMediaId resolver
 * 2. If meta.strategy is 'local': use src as-is (blob URLs for local files)
 * 3. If srcUrlId exists: call the resolver callback for that ID with the src (legacy)
 * 4. If no strategy/srcUrlId: use src as-is (legacy behavior)
 */
export async function resolveMediaUrl(
  src: string,
  srcUrlId: string | null | undefined,
  mediaUrlResolvers: Record<string, MediaUrlResolver> | undefined,
  meta?: { strategy?: string; contentMediaId?: string } | null
): Promise<string> {
  // Extract meta properties
  const strategy = meta?.strategy
  const contentMediaId = meta?.contentMediaId
  
  // No src and no contentMediaId, return empty
  if (!src && !contentMediaId) return ""

  // Case 1: contentMediaId strategy - use contentMediaId resolver
  if (strategy === 'contentMediaId' && contentMediaId) {
    const resolver = mediaUrlResolvers?.contentMediaId
    if (resolver) {
      try {
        const resolved = await resolver(contentMediaId)
        if (resolved) {
          return resolved
        }
        console.warn(`⚠️ contentMediaId resolver returned empty for: ${contentMediaId}`)
      } catch (error) {
        console.error(`Failed to resolve contentMediaId "${contentMediaId}":`, error)
      }
    } else {
      console.warn(`⚠️ No contentMediaId resolver found, but strategy is 'contentMediaId'`)
    }
    // Fallback to src if contentMediaId resolution fails
    return src || ""
  }

  // Case 2: local strategy - use src as-is (blob URLs)
  if (strategy === 'local') {
    return src
  }

  // No src for remaining cases, return empty
  if (!src) return ""

  // Case 3: srcUrlId exists - use resolver callback
  if (srcUrlId) {
    const resolver = mediaUrlResolvers?.[srcUrlId]
    if (resolver) {
      try {
        return await resolver(src)
      } catch (error) {
        console.error(`Failed to resolve media URL for srcUrlId "${srcUrlId}":`, error)
        return src // Fallback to original src on error
      }
    }
  }

  // Case 4: No special handling - use src as-is
  return src
}
