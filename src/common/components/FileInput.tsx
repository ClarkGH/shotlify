import type {FC, ChangeEvent} from "react";

interface FileInputProps {
    onFilesChange: (selectedFiles: FileList) => void;
    hideFileChosen?: boolean;
    accept?: string;
    className?: string;
}

const FileInput: FC<FileInputProps> = ({ onFilesChange, accept, className }) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { files } = event.target;

        if (files) onFilesChange(files);
    };

    return (
        <input
            className={
                `file:rounded file:border-0 file:text-md
                file:font-bold file:py-2 file:px-4
                file:text-white file:bg-gradient-to-br file:from-red-500 
                file:via-violet-600 file:to-blue-400 hover:file:bg-gradient-to-br
                hover:file:from-red-600 hover:file:via-violet-700 hover:file:to-blue-500
                active:file:ring-2 active:file:ring-violet-700 active:file:ring-inset
                focus:file:ring-2 focus:file:ring-violet-700 focus:file:ring-inset
                file:mr-4 ${className ? className : ''}`
            }
            type="file"
            accept={accept}
            multiple
            onChange={handleChange}
        />
    );
};

export default FileInput;
