import { encodeJpeg } from "./encode";
import { emptyFileError } from "./files";

/* Clark's copy (2026-11-26). */
export const photoCantOpen = (name: string): string =>
  `Couldn't open ${name}. Try a JPEG or PNG.`;

/* What an uploaded photo becomes before it's a frame: decoded with its
 * EXIF rotation applied, then re-encoded by encodeJpeg. The re-encode
 * drops all EXIF (GPS included) and downsizes. Rotation has to be applied
 * first: once the EXIF is gone, a phone photo saved sideways would stay
 * sideways. Rejects with a message naming the file, which the page
 * announces. */
export const preparePhoto = async (file: File): Promise<Blob> => {
  if (file.size === 0) throw emptyFileError(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    // Not an image, a format this browser can't decode (HEIC, say), or a
    // corrupt file: the user's fix is the same.
    throw new Error(photoCantOpen(file.name));
  }

  try {
    // ImageBitmap's size is after rotation.
    return await encodeJpeg(bitmap, bitmap.width, bitmap.height);
  } catch {
    throw new Error(photoCantOpen(file.name));
  } finally {
    bitmap.close();
  }
};
