import React, { useState } from "react";

interface FileProps {
    name: string;
}

interface FileInputProps {
    onFilesChange: (selectedFiles: FileProps[]) => void;
    hideFileChosen?: boolean;
    accept?: string;
}

const FileInput: React.FC<FileInputProps> = ({ onFilesChange, accept, hideFileChosen }) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []).map((file) => ({
            name: file.name,
        }));

        onFilesChange(selectedFiles);
    };

    return (
        <input className={hideFileChosen ? 'text-transparent' : ''} type="file" accept={accept} multiple onChange={handleChange} />
    );
};

export default FileInput;
