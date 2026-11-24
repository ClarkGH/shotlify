
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
      <h2 className="text-2xl font-semibold">Videos</h2>

      {sources.length
        ? <>
          <CarouselProvider
              className="mb-4 w-80 self-center"
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
                            text-white bg-gradient-to-br from-red-700
                            via-violet-700 to-blue-700
                            hover:bg-gradient-to-br hover:from-red-800
                            hover:via-violet-800 hover:to-blue-800 self-end`
                          }
                          onClick={() => onCaptureImageClick(index)}
                        >
                          Capture Image
                        </button>

                        <div className={
                          `bg-gray-100 hover:bg-white absolute
                          top-2 right-2 rounded-md`
                        }>
                          <button
                            className={
                              `text-gray-900 after:content-['X']
                              font-bold px-2`
                            }
                            aria-label={`Remove video ${index + 1}`}
                            onClick={() => onRemoveVideoClick(index)}
                          />
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
                    bg-gradient-to-br from-red-400 via-violet-400
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
        label="Add videos"
        accept={ACCEPTED_FILE_TYPES}
        onFilesChange={onFilesChange}
      />

      {areImages
        ? <button
          className={
            `rounded border-0 text-md
            font-bold py-2 px-4
            text-white bg-gradient-to-br from-red-700
            via-violet-700 to-blue-700
            hover:bg-gradient-to-br hover:from-red-800
            hover:via-violet-800 hover:to-blue-800`
          }
          onClick={onStageChange}
        >
          Preview Images
      </button>: ''}
    </div>
  );
};

export default VideosSection;
