import { useState } from "react";
import { type NextPage } from "next";

import Head from "next/head";
import Image from "next/image";
import FileInput from "../common/components/FileInput";

import { api } from "../utils/api";

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const Home: NextPage = () => {
  const [images, setImages] = useState<{files: string[]}>({ files: [] });
  const [imageSources, setImageSources] = useState<(string)[]>([]);
  const [videoSources, setVideoSources] = useState<(string)[]>([]);

  // Methods
  const captureImageFromVideo = (index: number) => {
    const video = document.querySelectorAll('video')[index];
    const canvas = document.createElement('canvas');

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = new Blob([canvas.toDataURL('image/jpeg')], { type: 'image/jpeg' });
    const blobFile = new File([blob], `screenshot_i_${index}.jpeg`);

    setImages((prevState) => {
      return {files: [JSON.stringify(blobFile) , ...prevState.files]}
    });

    setImageSources((prevImageSources) => [canvas.toDataURL('image/jpeg'), ...prevImageSources]);
  }

  // Event Handlers.
  const imageMutation = api.processor.processImages.useMutation();

  const handleFileChange = (selectedFiles: FileList) => {
    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file: File) => {
        const reader = new FileReader();
  
        reader.readAsDataURL(file);

        if (file.type.startsWith('image/')) {
          reader.onload = () => {
            setImages((prevState) => {
              return {files: [JSON.stringify(file) , ...prevState.files]}
            });

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
            return (
              <div className="flex flex-col gap-4 mb-4" key={`video-${index}`}>
                <video controls src={video} width={480} height={480}></video>

                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => captureImageFromVideo(index)}>
                  Get You a Screenshot
                </button>
              </div>
            )
          }) : ''}

          <FileInput accept={ACCEPTED_FILE_TYPES} onFilesChange={handleFileChange} />

          <div className="my-4">
            <button onClick={handleFileSubmit} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Upload Images</button>
          </div>

          {imageSources ? imageSources.map((image, index) => {
            return <Image src={image} alt={`Image Number ${index}.`} key={`img-${index}`} width={480} height={480}></Image>
          }) : ''}
        </main>
      </div>
    </>
  );
};

export default Home;
