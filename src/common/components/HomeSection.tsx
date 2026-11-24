type HomeSectionProps = {
  onStageChange?: () => void;
}

const HomeSection = ({onStageChange}: HomeSectionProps): JSX.Element => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Welcome</h2>

      <p className="text-xl text-gray-300 px-2 max-[375px]:max-w-[302px]">
        Shotlify, the all-in-one solution for creating
        stunning slideshows from your video content! With Shotlify,
        you can easily upload your videos, capture high-quality
        screenshots, and create engaging slideshows that will
        captivate your audience.
      </p>

      <button
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
        Get Started
      </button>
    </div>
  );
};

export default HomeSection;
