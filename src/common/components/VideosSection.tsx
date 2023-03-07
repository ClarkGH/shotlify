
import FileInput from "./FileInput";

import { CarouselProvider, Slider, Slide, DotGroup } from 'pure-react-carousel';
import 'pure-react-carousel/dist/react-carousel.es.css';

type VideosSectionProps = {
  areImages: boolean;
  sources: string[];
  onRemoveVideoClick: (index: number) => void;
  onCaptureImageClick: (index: number) => void;
  onFilesChange: (selectedImages: FileList) => void;
  onStageChange: () => void;
}

const ACCEPTED_FILE_TYPES = "video/*";

const VideosSection = ({
  areImages,
  sources,
  onRemoveVideoClick,
  onCaptureImageClick,
  onFilesChange,
  onStageChange,
}: VideosSectionProps): JSX.Element => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl">Videos</h2>

      {sources.length
        ? <>
          <CarouselProvider
              className="mb-4 max-h-{500} w-80"
              naturalSlideWidth={360}
              naturalSlideHeight={500}
              totalSlides={sources.length}
            >
              <Slider>
                {sources.map((video, index) => {
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
                            text-gray-300 bg-gradient-to-br from-red-500
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

              {sources.length > 1
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

      {areImages
        ? <button
          className={
            `rounded border-0 text-md
            font-bold py-2 px-4
            text-gray-300 bg-gradient-to-br from-red-500
            via-violet-600 to-blue-400
            hover:bg-gradient-to-br hover:from-red-600
            hover:via-violet-700 hover:to-blue-500`
          }
          onClick={onStageChange}
        >
          Preview Images
      </button>: ''}

      <FileInput
        className="mt-4"
        accept={ACCEPTED_FILE_TYPES}
        onFilesChange={onFilesChange}
      />
    </div>
  );
};

export default VideosSection;
