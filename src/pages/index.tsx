import { type NextPage } from "next";
import Head from "next/head";
import React, { useState } from "react";
import FileInput from "../../Components/FileInput";
// import Link from "next/link";

// import { api } from "../utils/api";
interface FileProps {
  name: string;
}

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const Home: NextPage = () => {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });
  const [files, setFiles] = useState<FileProps[]>([]);

  const handleFiles = (selectedFiles: FileProps[]) => {
    setFiles(selectedFiles);
  }

  return (
    <>
      <Head>
        <title>Shotlify</title>
        <meta name="description" content="Take screenshots and create a slideshow with your own custom videos!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col items-center bg-[#A0AECD]">
        <header className="mb-8">
          <h1 className="text-black text-6xl mt-12">Shotlify</h1>
        </header>
        <main className="flex flex-col items-center">
          <FileInput accept={ACCEPTED_FILE_TYPES} onFilesChange={handleFiles}/>
          {files.length > 0 && (
            <ul>
              {files.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
};

export default Home;
