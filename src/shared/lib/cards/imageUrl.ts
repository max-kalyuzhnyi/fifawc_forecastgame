/** Full FIFA card composites are stored under the fifarosters storage prefix. */
export function isFullCardArtImageUrl(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl?.includes("/fifarosters/"));
}
