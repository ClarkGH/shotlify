import type {FC, ChangeEvent} from "react";

interface FileInputProps {
    onFilesChange: (selectedFiles: FileList) => void;
    hideFileChosen?: boolean;
    accept?: string;
}

const FileInput: FC<FileInputProps> = ({ onFilesChange, accept, hideFileChosen }) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { files } = event.target;

        if (files) onFilesChange(files);
    };

    return (
        <input
            className={hideFileChosen ? 'text-transparent' : ''}
            type="file"
            accept={accept}
            multiple 
            onChange={handleChange}
        />
    );
};

export default FileInput;
