/* Reads a picked file into a data: URL. Rejects with an Error when the
 * read fails or is aborted, so the caller can tell the user instead of
 * a frame silently never showing up. Slice 4 replaces this with
 * URL.createObjectURL. */
export const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    // A 0-byte file reads "successfully" as a header-only data: URL,
    // which would show up as a broken image.
    if (file.size === 0) {
      reject(new Error(`Couldn't read ${file.name}: the file is empty`));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      // readAsDataURL always yields a string; check rather than cast.
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Couldn't read ${file.name}: no data`));
      }
    };
    reader.onerror = () => {
      const reason = reader.error?.message ?? "unknown error";
      reject(new Error(`Couldn't read ${file.name}: ${reason}`));
    };
    reader.onabort = () => {
      reject(new Error(`Reading ${file.name} was cancelled`));
    };

    reader.readAsDataURL(file);
  });
