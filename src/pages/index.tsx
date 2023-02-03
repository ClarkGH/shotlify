import { type NextPage } from "next";
import Image from "next/image";
import Head from "next/head";
import { useState } from "react";
import { fileURLToPath } from "url";
import FileInput from "../common/components/FileInput";

// import Link from "next/link";
// import { api } from "../utils/api";
// const hello = api.example.hello.useQuery({ text: "from tRPC" });

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const Home: NextPage = () => {
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [imageSources, setImageSources] = useState<(string)[]>([]);

  const handleFileChange = (selectedFiles: FileList) => {
    if (selectedFiles.length) {

    }
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file: File) => {
        if (file.type.startsWith('image/')) {
          
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            setImages((prevImages) => [file, ...prevImages]);
            setImageSources((prevImageSources) => [reader.result as string, ...prevImageSources]);
          };
          
        } else {
          console.log('Video embedding stuff here.');
        }
      });
    }
  }

  return (
    <>
      <Head>
        <title>Shotlify</title>
        <meta name="description" content="Take screenshots and create a slideshow with your uploaded media!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col items-center bg-[#A0AECD]">
        <header className="mb-8">
          <h1 className="text-black text-6xl mt-12">Shotlify</h1>
        </header>
        <main className="flex flex-col items-center">
          <FileInput accept={ACCEPTED_FILE_TYPES} onFilesChange={handleFileChange} hideFileChosen={true} />

          {imageSources ? imageSources.map((image, index) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return <Image src={image} alt={`Image Number ${index}. File Name: ${images[index]!.name}`} key={`img-no-${index}`} width={480} height={480}></Image>
          }) : ''}
        </main>
      </div>
    </>
  );
};

export default Home;
