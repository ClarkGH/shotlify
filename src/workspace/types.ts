/* The workspace's data. Ids are stable for an item's whole life, so focus
 * and announcements survive removals. Slice 4 grows Frame (photo vs.
 * capture, which video it came from) and moves src to blob: URLs. */

export type Frame = {
  id: string;
  /* data: URL for now */
  src: string;
};

export type Video = {
  id: string;
  /* data: URL for now */
  src: string;
  /* the file name, for labels like "Remove video beach.mp4" */
  name: string;
};
