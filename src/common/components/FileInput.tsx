import type {FC, ChangeEvent} from "react";

interface FileInputProps {
    onFilesChange: (selectedFiles: FileList) => void;
    hideFileChosen?: boolean;
    accept?: string;
}

const FileInput: FC<FileInputProps> = ({ onFilesChange, accept }) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { files } = event.target;

        if (files) onFilesChange(files);
    };

    return (
        <input
            className="file:rounded file:border-0 file:text-md file:font-bold file:text-white file:bg-blue-500 hover:file:bg-blue-700"
            type="file"
            accept={accept}
            multiple 
            onChange={handleChange}
        />
    );
};

export default FileInput;
