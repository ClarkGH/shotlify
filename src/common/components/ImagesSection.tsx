import Image from "next/image";
import FileInput from "./FileInput";

import { CarouselProvider, Slider, Slide, DotGroup } from 'pure-react-carousel';
import 'pure-react-carousel/dist/react-carousel.es.css';

type ImagesSectionProps = {
  sources: string[];
  onClick: (index: number) => void;
  onFilesChange: (selectedImages: FileList) => void;
}

const ACCEPTED_FILE_TYPES = "image/png, image/gif, image/jpeg";

const ImagesSection = ({
  sources,
  onClick,
  onFilesChange
}: ImagesSectionProps): JSX.Element => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className={`text-2xl font-semibold`}>Images</h2>

      {sources.length
        ? <>
            <CarouselProvider
              className="w-80 self-center"
              naturalSlideWidth={300}
              naturalSlideHeight={300}
              totalSlides={sources.length}
            >
              <Slider>
                {sources.map((image, index) => {
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
                            onClick={() => onClick(index)}
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

              {sources.length > 1
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

      <FileInput
        className="mt-4"
        accept={ACCEPTED_FILE_TYPES}
        onFilesChange={onFilesChange}
      />

      {sources.length ? <button
          className={
            `rounded border-0 text-md
            font-bold py-2 px-4
            text-gray-300 bg-gradient-to-br from-red-500
            via-violet-600 to-blue-400
            hover:bg-gradient-to-br hover:from-red-600
            hover:via-violet-700 hover:to-blue-500`
          }
          onClick={() => console.log('boop')}
        >
          Create Slideshow
      </button>: ''}
    </div>
  );
};

export default ImagesSection;
