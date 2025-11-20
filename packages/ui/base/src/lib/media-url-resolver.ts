/**
 * Type definition for video URL strategy resolver
 * @param meta - Metadata object from the video node (must contain srcResolveStrategy and fileId)
 * @returns Promise resolving to the full URL to use for the video
 */
export type VideoStrategyResolver = (meta: unknown) => Promise<string> | string

/**
 * Type definition for image URL strategy resolver
 * @param meta - Metadata object from the image node (must contain srcResolveStrategy and fileId)
 * @returns Promise resolving to the full URL to use for the image
 */
export type ImageStrategyResolver = (meta: unknown) => Promise<string> | string

/**
 * Type definition for audio URL strategy resolver
 * @param meta - Metadata object from the audio node (must contain srcResolveStrategy and fileId)
 * @returns Promise resolving to the full URL to use for the audio
 */
export type AudioStrategyResolver = (meta: unknown) => Promise<string> | string

/**
 * Type definition for file URL strategy resolver
 * @param meta - Metadata object from the file node (must contain srcResolveStrategy and fileId)
 * @returns Promise resolving to the full URL to use for the file
 */
export type FileStrategyResolver = (meta: unknown) => Promise<string> | string

/**
 * Resolves media URL using the provided strategy resolver
 * 
 * Rules:
 * 1. If no meta provided: return empty string
 * 2. If no strategy provided: return empty string
 * 3. If strategy exists: call it with meta only
 * 4. If strategy fails: return empty string
 */
export async function resolveMediaUrl(
  meta: unknown,
  strategyResolver: VideoStrategyResolver | ImageStrategyResolver | AudioStrategyResolver | FileStrategyResolver | undefined
): Promise<string> {
  // No meta, return empty
  if (!meta) return ""

  // Case 1: No strategy - return empty
  if (!strategyResolver) {
    return ""
  }

  // Case 2: Use strategy resolver with meta only
  try {
    return await strategyResolver(meta)
  } catch (error) {
    console.error(`Failed to resolve media URL:`, error)
    return "" // Return empty on error
  }
}
