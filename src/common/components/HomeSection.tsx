type HomeSectionProps = {
  onStageChange?: () => void;
}

const HomeSection = ({onStageChange}: HomeSectionProps): JSX.Element => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl min-w-full">How it Works</h2>

      <ol className="list-decimal list-inside text-xl">
        <li>Upload your videos.</li>
        <li>Take screenshots of your video(s) with Shotlify.</li>
        <li>Edit the images.</li>
        <li>Send the images to our slideshow-inator.</li>
        <li>Get a slideshow back.</li>
      </ol>

      <button
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
        Get Started
      </button>
    </div>
  );
};

export default HomeSection;
