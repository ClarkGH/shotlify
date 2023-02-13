import { useState } from "react";
import { type NextPage } from "next";

import Head from "next/head";
import Image from "next/image";
import FileInput from "../common/components/FileInput";

import { CarouselProvider, Slider, Slide, DotGroup } from 'pure-react-carousel';
import 'pure-react-carousel/dist/react-carousel.es.css';

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const Home: NextPage = () => {
  const [images, setImages] = useState<{images: string[]}>({ images: [] });
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

    setImages((prevState) => {
      return {images: [JSON.stringify(canvas.toDataURL('image/jpeg')), ...prevState.images]};
    });

    setImageSources((prevImageSources) => [canvas.toDataURL('image/jpeg'), ...prevImageSources]);
  }

  const handleFileChange = (selectedImages: FileList) => {
    if (selectedImages) {
      Array.from(selectedImages).forEach((image: File) => {
        const reader = new FileReader();
  
        reader.readAsDataURL(image);

        if (image.type.startsWith('image/')) {
          reader.onload = () => {
            setImages((prevState) => {
              return {images: [JSON.stringify(reader.result as string) , ...prevState.images]};
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

        <main>
          {videoSources.length
            ? <CarouselProvider
                className="mb-4 max-h-{500} w-80"
                naturalSlideWidth={360}
                naturalSlideHeight={500}
                totalSlides={videoSources.length}
              >
                <Slider>
                  {videoSources.map((video, index) => {
                    return (
                      <Slide innerClassName="grid grid-cols-1 gap-4 justify-items-center items-end" key={`slide-${index}`} index={index}>
                          <h3>Video #{index}</h3>
                          <video controls className="max-h-80 max-w-80" src={video} width={320} height={320}></video>
                          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => captureImageFromVideo(index)}>
                            Capture Image
                          </button>
                      </Slide>
                    )
                  })}
                </Slider>

                {videoSources.length > 1 ? <DotGroup className="flex flex-wrap gap-2 mt-4 font-semibold justify-center" dotNumbers /> : ''}
              </CarouselProvider> 
          : ''}

          <FileInput accept={ACCEPTED_FILE_TYPES} onFilesChange={handleFileChange} />

          {imageSources.length
            ? <CarouselProvider
                className="mb-4 w-72"
                naturalSlideWidth={360}
                naturalSlideHeight={500}
                totalSlides={imageSources.length}
              >
                <Slider>
                  {imageSources.map((image, index) => {
                    return (
                      <Slide innerClassName="flex grid grid-col-1 justify-items-center items-end" key={`slide-${index}`} index={index}>
                        <h3>Image #{index}</h3>
                        <Image className="my-4" src={image} alt={`Image Number ${index}.`} key={`img-${index}`} width={320} height={320}></Image>
                      </Slide>
                    )
                  })}
                </Slider>

                {imageSources.length > 1 ? <DotGroup className="flex flex-wrap w-72 gap-2 mt-4 font-semibold justify-center" dotNumbers /> : ''}
              </CarouselProvider>
          : ''}
        </main>
      </div>
    </>
  );
};

export default Home;
