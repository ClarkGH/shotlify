import { useState } from "react";
import { type NextPage } from "next";

import Head from "next/head";
import Image from "next/image";
import FileInput from "../common/components/FileInput";

import { CarouselProvider, Slider, Slide, DotGroup } from 'pure-react-carousel';
import 'pure-react-carousel/dist/react-carousel.es.css';

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const Home: NextPage = () => {
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

    setImageSources((prevImageSources) => [...prevImageSources, canvas.toDataURL('image/png')]);
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

  const handleFileChange = (selectedImages: FileList) => {
    if (selectedImages) {
      Array.from(selectedImages).forEach((image: File) => {
        const reader = new FileReader();

        reader.readAsDataURL(image);

        if (image.type.startsWith('image/')) {
          reader.onload = () => {
            setImageSources((prevImageSources) => [...prevImageSources, reader.result as string]);
          };
        } else {
          reader.onload = () => {
            setVideoSources((prevVideoSources) => [...prevVideoSources, reader.result as string]);
          };
        }
      });
    }
  };


  return (
    <>
      <Head>
        <title>Shotlify</title>

        <meta name="description" content="Take screenshots and create a slideshow with your uploaded media!" />

        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col items-center bg-black">
        <header className="mb-8">
          <h1
            className={
              `text-6xl mt-12 bg-gradient-to-r
              from-red-500 via-violet-600 to-blue-500
              bg-clip-text text-transparent`}
            >
              Shotlify
          </h1>
        </header>

        <main>
          {videoSources.length
            ? <>
              <h2 className={
                `text-2xl bg-gradient-to-r from-red-500
                via-violet-600 to-blue-500 bg-clip-text
                text-transparent`
              }>
                Videos
              </h2>

              <CarouselProvider
                  className="mb-4 max-h-{500} w-80"
                  naturalSlideWidth={360}
                  naturalSlideHeight={500}
                  totalSlides={videoSources.length}
                >
                  <Slider>
                    {videoSources.map((video, index) => {
                      return (
                        <Slide
                          innerClassName="grid grid-cols-1 justify-items-center gap-4"
                          key={`slide-${index}`}
                          index={index}
                        >
                            <video
                              className="max-h-80 max-w-80 self-center"
                              src={video}
                              width={320}
                              height={320}
                              controls
                            />

                            <button
                              className={
                                `rounded border-0 text-md
                                font-bold py-2 px-4
                                text-white bg-gradient-to-br from-red-500
                                via-violet-600 to-blue-400 hover:bg-gradient-to-br
                                hover:from-red-600 hover:via-violet-700 hover:to-blue-500
                                self-end`
                              }
                              onClick={() => captureImageFromVideo(index)}
                            >
                              Capture Image
                            </button>

                            <button
                              className={
                                `bg-gradient-to-r from-red-500 via-violet-600
                                to-blue-500 bg-clip-text text-transparent
                                hover:from-red-600 hover:via-violet-700 hover:to-blue-600
                                absolute top-4 right-4
                                after:content-['X'] font-bold px-2`
                              }
                              aria-label="remove"
                              onClick={() => removeVideo(index)}
                            />
                        </Slide>
                      )
                    })}
                  </Slider>

                  {videoSources.length > 1
                    ? <DotGroup
                      className={
                        `flex flex-wrap gap-2
                        mt-4 font-semibold justify-center
                        bg-gradient-to-br from-red-500 via-violet-600
                        to-blue-400 bg-clip-text text-transparent`
                      }
                      dotNumbers
                    /> : ''
                  }
                </CarouselProvider>
            </>
          : ''}

          <FileInput
            className="mt-4"
            accept={ACCEPTED_FILE_TYPES}
            onFilesChange={handleFileChange}
          />

          {imageSources.length
            ? <>
                <h2
                  className={
                    `text-2xl mt-4 bg-gradient-to-r
                    from-red-500 via-violet-600 to-blue-500
                    bg-clip-text text-transparent`
                  }
                >
                  Images
                </h2>

                <CarouselProvider
                  className="w-80"
                  naturalSlideWidth={360}
                  naturalSlideHeight={600}
                  totalSlides={imageSources.length}
                >
                  <Slider>
                    {imageSources.map((image, index) => {
                      return (
                        <Slide
                          innerClassName={`grid grid-col-1 justify-items-center items-start`}
                          key={`slide-${index}`}
                          index={index}
                        >
                          <div className="relative">
                            <button
                              className={`
                                bg-gradient-to-r from-red-500 via-violet-600
                                to-blue-500 hover:from-red-600 hover:via-violet-700
                                hover:to-blue-600 font-bold py-2
                                px-2 bg-clip-text text-transparent
                                absolute top-4 right-2
                                after:content-['X']
                              `}
                              aria-label="remove"
                              onClick={() => removeImage(index)}
                            />

                            <Image
                              className="my-4"
                              src={image}
                              alt={`Image Number ${index}.`}
                              key={`img-${index}`}
                              width={320}
                              height={600}
                            />
                          </div>
                        </Slide>
                      )
                    })}
                  </Slider>

                  {imageSources.length > 1
                    ? <DotGroup
                      className={`
                        flex flex-wrap w-72 gap-2
                        mt-4 font-semibold justify-center
                        bg-gradient-to-br from-red-500 via-violet-600
                        to-blue-400 bg-clip-text text-transparent
                      `}
                      dotNumbers
                    />
                    : ''}
                </CarouselProvider>
              </>
          : ''}
        </main>
      </div>
    </>
  );
};

export default Home;
