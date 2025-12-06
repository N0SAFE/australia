/**
 * Type definition for media URL resolver callback
 * @param src - The original source path/URL or contentMediaId
 * @returns Promise resolving to the full URL to use for the media
 */
export type MediaUrlResolver = (src: string) => Promise<string> | string

/**
 * Type definition for strategy-based media URL resolver
 * Takes full meta object and returns resolved URL
 * @param meta - The meta object containing contentMediaId and other metadata
 * @returns Promise resolving to the full URL to use for the media
 */
export type ImageStrategyResolver = (meta: unknown) => Promise<string> | string
export type VideoStrategyResolver = (meta: unknown) => Promise<string> | string
export type AudioStrategyResolver = (meta: unknown) => Promise<string> | string
export type FileStrategyResolver = (meta: unknown) => Promise<string> | string

/**
 * Progress callback for download operations
 * @param progress - Download progress percentage (0-100)
 */
export type DownloadProgressCallback = (progress: number) => void

/**
 * Type definition for media download handler
 * Handles the download of a media file with progress tracking
 * @param meta - The meta object containing contentMediaId and other metadata
 * @param filename - Suggested filename for the download
 * @param onProgress - Callback to report download progress (0-100)
 * @returns Promise that resolves when download completes
 */
export type MediaDownloadHandler = (
  meta: unknown,
  filename: string,
  onProgress: DownloadProgressCallback
) => Promise<void>

/**
 * Resolves media URL using a strategy function (new pattern)
 * @param meta - Meta object with contentMediaId and strategy info
 * @param strategy - Strategy resolver function that takes meta and returns URL
 * @returns Promise resolving to the full media URL
 */
export async function resolveMediaUrl(
  meta: unknown,
  strategy: ImageStrategyResolver | VideoStrategyResolver | AudioStrategyResolver | FileStrategyResolver | undefined
): Promise<string>

/**
 * Resolves media URLs based on meta information and injected resolver callbacks (legacy pattern)
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
): Promise<string>

/**
 * Implementation for both overloads
 */
export async function resolveMediaUrl(
  srcOrMeta: unknown,
  srcUrlIdOrStrategy?: string | null | ImageStrategyResolver | VideoStrategyResolver | AudioStrategyResolver | FileStrategyResolver,
  mediaUrlResolvers?: Record<string, MediaUrlResolver>,
  meta?: { strategy?: string; contentMediaId?: string } | null
): Promise<string> {
  // New pattern: resolveMediaUrl(meta, strategy)
  if (typeof srcUrlIdOrStrategy === 'function') {
    const strategy = srcUrlIdOrStrategy
    try {
      const resolved = await strategy(srcOrMeta)
      return resolved || ""
    } catch (error) {
      console.error('Strategy resolver failed:', error)
      return ""
    }
  }

  // Legacy pattern: resolveMediaUrl(src, srcUrlId, mediaUrlResolvers, meta)
  const src = srcOrMeta as string
  const srcUrlId = srcUrlIdOrStrategy
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
