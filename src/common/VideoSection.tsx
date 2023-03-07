
import Image from "next/image";
import FileInput from "../common/components/FileInput";

import { CarouselProvider, Slider, Slide, DotGroup } from 'pure-react-carousel';
import 'pure-react-carousel/dist/react-carousel.es.css';

type VideoSectionProps = {
  videoSources: string[];
  imageSources: string[];
  onRemoveImageClick: (index: number) => void;
  onRemoveVideoClick: (index: number) => void;
  onCaptureImageClick: (index: number) => void;
  onFilesChange: (selectedImages: FileList) => void;
}

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg, video/*";

const VideoSection = ({
  videoSources,
  imageSources,
  onRemoveImageClick,
  onRemoveVideoClick,
  onCaptureImageClick,
  onFilesChange
}: VideoSectionProps): JSX.Element => {
  return (
    <div className="mb-8">
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
                      innerClassName={
                        `grid grid-cols-1 justify-items-center gap-4`
                      }
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
                            via-violet-600 to-blue-400
                            hover:bg-gradient-to-br hover:from-red-600
                            hover:via-violet-700 hover:to-blue-500 self-end`
                          }
                          onClick={() => onCaptureImageClick(index)}
                        >
                          Capture Image
                        </button>

                        <div className={
                          `bg-gray-300 hover:bg-gray-400 absolute
                          top-2 right-2 rounded-md`
                        }>
                          <button
                            className={
                              `bg-gradient-to-r from-red-500 via-violet-600
                              to-blue-500 bg-clip-text text-transparent
                              hover:from-red-600 hover:via-violet-700
                              hover:to-blue-600 after:content-['X']
                              font-bold px-2`
                            }
                            aria-label="remove"
                            onClick={() => onRemoveVideoClick(index)}
                          >
                            <span className="sr-only">Remove video</span>
                          </button>
                        </div>
                    </Slide>
                  );
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
        onFilesChange={onFilesChange}
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
                      innerClassName={
                        `grid grid-col-1 justify-items-center items-start`
                      }
                      key={`slide-${index}`}
                      index={index}
                    >
                      <div className="relative">
                        <div
                          className={
                            `bg-gray-300 hover:bg-gray-400 absolute
                            top-6 right-2 rounded-md`
                          }
                        >
                          <button
                            className={
                              `bg-gradient-to-r from-red-500 via-violet-600
                              to-blue-500 bg-clip-text text-transparent
                              hover:from-red-600 hover:via-violet-700
                              hover:to-blue-600 after:content-['X']
                              font-bold px-2`
                            }
                            aria-label="remove"
                            onClick={() => onRemoveImageClick(index)}
                          >
                            <span className="sr-only">Remove image</span>
                          </button>
                        </div>

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
                  );
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
    </div>
  );
};

export default VideoSection;
