import { type NextPage } from "next";
import Image from "next/image";
import Head from "next/head";
import { useState } from "react";
import FileInput from "../common/components/FileInput";

// import Link from "next/link";
// import { api } from "../utils/api";
// const hello = api.example.hello.useQuery({ text: "from tRPC" });

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const Home: NextPage = () => {
  const [images, setImages] = useState<File[]>([]);
  const [imageSources, setImageSources] = useState<(string)[]>([]);
  const [videoSources, setVideoSources] = useState<(string)[]>([]);

  const handleFileChange = (selectedFiles: FileList) => {
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file: File) => {
        const reader = new FileReader();
  
        reader.readAsDataURL(file);

        if (file.type.startsWith('image/')) {
          reader.onload = () => {
            setImages((prevImages) => [file, ...prevImages]);
            setImageSources((prevImageSources) => [reader.result as string, ...prevImageSources]);
          };
        } else {
          reader.onload = () => {
            setVideoSources((prevVideoSources) => [reader.result as string, ...prevVideoSources]);
          };
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
          {videoSources ? videoSources.map((video, index) => {
            return <video controls src={video} key={`video-${index}`} width={480} height={480} ></video>
          }) : ''}

          <FileInput accept={ACCEPTED_FILE_TYPES} onFilesChange={handleFileChange} hideFileChosen={true} />

          {imageSources ? imageSources.map((image, index) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return <Image src={image} alt={`Image Number ${index}. File Name: ${images[index]!.name}`} key={`img-${index}`} width={480} height={480}></Image>
          }) : ''}
        </main>
      </div>
    </>
  );
};

export default Home;
