import React, { useState } from "react";

interface FileProps {
    name: string;
}

interface FileInputProps {
    onFilesChange: (selectedFiles: FileProps[]) => void;
    accept?: string;
}

const FileInput: React.FC<FileInputProps> = ({ onFilesChange, accept }) => {
    const [files] = useState<FileProps[]>([]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []).map((file) => ({
            name: file.name,
        }));

        onFilesChange(selectedFiles);
    };

    return (
        <div>
            <input type="file" accept={accept} multiple onChange={handleChange} />
            {files.length > 0 && (
                <ul>
                    {files.map((file) => (
                        <li key={file.name}>{file.name}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default FileInput;
