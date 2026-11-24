import { useId, type ChangeEvent } from "react";

interface FileInputProps {
    label: string;
    onFilesChange: (selectedFiles: FileList) => void;
    hideFileChosen?: boolean;
    accept?: string;
    className?: string;
}

const FileInput = ({
  label,
  onFilesChange,
  accept,
  className,
}: FileInputProps) => {
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;

    if (files) onFilesChange(files);
  };

  return (
    <div className={`flex flex-col gap-2 ${className ? className : ''}`}>
      <label htmlFor={id} className="text-gray-100 font-semibold">
        {label}
      </label>

      <input
        id={id}
        className={
          `file:rounded file:border-0 file:text-md
          file:font-bold file:py-2 file:px-4
          file:text-white file:bg-gradient-to-br file:from-red-700
          file:via-violet-700 file:to-blue-700 hover:file:bg-gradient-to-br
          hover:file:from-red-800 hover:file:via-violet-800
          hover:file:to-blue-800
          active:file:ring-2 active:file:ring-violet-700 active:file:ring-inset
          focus:file:ring-2 focus:file:ring-violet-700 focus:file:ring-inset
          bg-gradient-to-br from-red-400 via-violet-400
          to-blue-400 bg-clip-text text-transparent
          file:mr-4`
        }
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
      />
    </div>
  );
};

export default FileInput;
