import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import VideosSection from "../common/components/VideosSection";
import ImagesSection from "../common/components/ImagesSection";
import 'pure-react-carousel/dist/react-carousel.es.css';
import HomeSection from "../common/components/HomeSection";

export type Stage = 'HOME' | 'VIDEOS' | 'IMAGES';

const HOME = 'HOME',
  VIDEOS = 'VIDEOS',
  IMAGES = 'IMAGES';

const Home: NextPage = () => {
  const [imageSources, setImageSources] = useState<(string)[]>([]);
  const [videoSources, setVideoSources] = useState<(string)[]>([]);
  const [stage, setStage] = useState<Stage>(HOME);

  // Methods
  const captureImageFromVideo = (index: number) => {
    const video = document.querySelectorAll('video')[index];
    const canvas = document.createElement('canvas');

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    setImageSources((prevImageSources) => {
      return [...prevImageSources, canvas.toDataURL('image/png')];
    });
  };

  const removeImage = (imageIndex: number) => {
    setImageSources((prevState) => {
      return prevState.filter((_, index): boolean => index !== imageIndex);
    });
  };

  const removeVideo = (videoIndex: number) => {
    setVideoSources((prevState) => {
      return prevState.filter((_, index): boolean => index !== videoIndex);
    });
  };

  const handleImageFilesChange = (selectedImages: FileList) => {
    if (selectedImages) {
      Array.from(selectedImages).forEach((image: File) => {
        const reader = new FileReader();

        reader.readAsDataURL(image);

        reader.onload = () => {
          setImageSources((prevImageSources) => {
            return [...prevImageSources, reader.result as string];
          });
        };
      });
    }
  };

  const handleVideoFileChange = (selectedVideos: FileList) => {
    if (selectedVideos) {
      Array.from(selectedVideos).forEach((video: File) => {
        const reader = new FileReader();

        reader.readAsDataURL(video);

        reader.onload = () => {
          setVideoSources((prevVideoSources) => {
            return [...prevVideoSources, reader.result as string];
          });
        };
      });
    }
  };


  return (
    <>
      <Head>
        <title>Shotlify</title>

        <meta
          name="description"
          content={
            `Shotlify, the all-in-one solution for creating
            stunning slideshows from your video content! With Shotlify,
            you can easily upload your videos, capture high-quality
            screenshots, and create engaging slideshows that will
            captivate your audience.`
          }
        />

        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col items-center">
        <header className="mb-8 flex flex-col items-center">
          <h1
            className={
              `text-6xl mt-12 bg-gradient-to-r
              from-red-500 via-violet-600 to-blue-500
              bg-clip-text text-transparent`}
            >
              Shotlify
          </h1>

          <nav className="flex gap-3">
            <a
              className={
                `text-l bg-gradient-to-r
                from-red-500 via-violet-600 to-blue-500
                hover:bg-gradient-to-br hover:from-red-600
                hover:via-violet-700 hover:to-blue-500
                bg-clip-text text-transparent font-semibold`
              }
              href=""
              onClick={(evt) => {
                evt.preventDefault();
                setStage(HOME);
              }}
            >
              Home
            </a>

            <div aria-hidden={true} className={
              `text-l text-gray-300`
            }>|</div>

            <a
              className={
                `text-l bg-gradient-to-r
                from-red-500 via-violet-600 to-blue-500
                hover:bg-gradient-to-br hover:from-red-600
                hover:via-violet-700 hover:to-blue-500
                bg-clip-text text-transparent font-semibold`
              }
              href=""
              onClick={(evt) => {
                evt.preventDefault();
                setStage(VIDEOS);
              }}
            >
              Videos
            </a>

            <div aria-hidden={true} className={
              `text-l text-gray-300`
            }>|</div>

            <a
              className={
                `text-l bg-gradient-to-r
                from-red-500 via-violet-600 to-blue-500
                hover:bg-gradient-to-br hover:from-red-600
                hover:via-violet-700 hover:to-blue-500
                bg-clip-text text-transparent font-semibold`
              }
              href=""
              onClick={(evt) => {
                evt.preventDefault();
                setStage(IMAGES);
              }}
            >
              Images
            </a>
          </nav>
        </header>

        <main>
          <div className={
            `bg-gradient-to-r from-red-500
            via-violet-600 to-blue-500 bg-clip-text
            text-transparent mb-8 w-80`
          }>
            {stage === HOME
              ? <HomeSection onStageChange={() => setStage(VIDEOS)} />
              : ''}

            {stage === VIDEOS
              ? <VideosSection
                sources={videoSources}
                onFilesChange={handleVideoFileChange}
                onCaptureImageClick={captureImageFromVideo}
                onRemoveVideoClick={removeVideo}
                onStageChange={() => setStage(IMAGES)}
                areImages={imageSources.length > 0}
              />: ''}

            {stage === IMAGES
              ? <ImagesSection
              sources={imageSources}
              onClick={removeImage}
              onFilesChange={handleImageFilesChange}
            />: ''}
          </div>
        </main>
      </div>
    </>
  );
};

export default Home;
