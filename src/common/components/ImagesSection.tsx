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
      <h2 className="text-2xl font-semibold">Images</h2>

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
                        `grid grid-cols-1 justify-items-center items-start`
                      }
                      key={`slide-${index}`}
                      index={index}
                    >
                      <div className="relative">
                        <div
                          className={
                            `bg-gray-100 hover:bg-white absolute
                            top-6 right-2 rounded-md`
                          }
                        >
                          <button
                            className={
                              `text-gray-900 after:content-['X']
                              font-bold px-2`
                            }
                            aria-label={`Remove image ${index + 1}`}
                            onClick={() => onClick(index)}
                          />
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
                    bg-gradient-to-br from-red-400 via-violet-400
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
        label="Add images"
        accept={ACCEPTED_FILE_TYPES}
        onFilesChange={onFilesChange}
      />

      {sources.length ? <button
          className={
            `rounded border-0 text-md
            font-bold py-2 px-4
            text-white bg-gradient-to-br from-red-700
            via-violet-700 to-blue-700
            hover:bg-gradient-to-br hover:from-red-800
            hover:via-violet-800 hover:to-blue-800`
          }
          onClick={() => console.log('boop')}
        >
          Create Slideshow
      </button>: ''}
    </div>
  );
};

export default ImagesSection;
