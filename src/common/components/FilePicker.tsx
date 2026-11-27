import { type ChangeEvent } from "react";

import { type ButtonSize, type ButtonVariant } from "./Button";
import styles from "./Button.module.css";

/* Looks like a Button, but it's a <label> wrapping a visually hidden file
 * input: the input keeps native keyboard and screen reader behavior, and
 * the label lifts when the input has keyboard focus. Shares Button's
 * stylesheet so the two can't drift apart. Used for both "Add video" and
 * "Add photos". */
export type FilePickerProps = {
  label: string;
  /* e.g. "video/*" or "image/*" */
  accept: string;
  multiple: boolean;
  variant: ButtonVariant;
  size?: ButtonSize;
  /* An array, not the FileList: the input is cleared after each pick so
   * the same file can be chosen twice, and clearing empties a FileList. */
  onFilesChosen: (files: File[]) => void;
};

const FilePicker = ({
  label,
  accept,
  multiple,
  variant,
  size = "regular",
  onFilesChosen,
}: FilePickerProps): JSX.Element => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    // Copy before clearing: the FileList empties when value is reset.
    const files = input.files ? Array.from(input.files) : [];

    input.value = "";

    // A cancelled dialog can still fire change with nothing picked.
    if (files.length > 0) onFilesChosen(files);
  };

  return (
    <label
      className={styles.button}
      data-variant={variant}
      data-size={size}
    >
      {label}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
    </label>
  );
};

export default FilePicker;
