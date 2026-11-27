/* A 0-byte file "works" as a URL but shows up as a broken image or a
 * video that never loads, so videos and photos both refuse it. */
export const emptyFileError = (file: File): Error =>
  new Error(`Couldn't read ${file.name}: the file is empty`);

/* A blob: URL for a picked file. Nothing is read up front: the browser
 * reads from disk as the video plays, so a huge file doesn't freeze the
 * tab. The URL holds the file in memory until it's revoked;
 * useReleaseUrls does that when the item leaves the workspace. */
export const objectUrlFor = (file: File): string => {
  if (file.size === 0) throw emptyFileError(file);
  return URL.createObjectURL(file);
};
