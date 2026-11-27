import Button from "../common/components/Button";

/* The "Create slideshow" bar and the privacy line ("Nothing is stored.
 * Download your slideshow or it's gone."). With zero frames the button is
 * blocked with the reason "No frames collected". onCreate stays a no-op
 * until slice 5.
 *
 * Static, not fixed to the viewport: a fixed bar can cover whatever has
 * keyboard focus (WCAG 2.4.11), which is what the prototype ran into.
 * The canvas's summary line ("5 frames, about 25 seconds long") waits on
 * Clark's copy and on slice 5's seconds-per-frame, so frameCount only
 * decides the blocked state for now. */
export type CreateBarProps = {
  frameCount: number;
  onCreate: () => void;
};

const CreateBar = ({ frameCount, onCreate }: CreateBarProps): JSX.Element => {
  // `< 1` rather than `=== 0`: a bad count (negative, NaN) blocks too.
  const blocked = !(frameCount >= 1);

  return (
    <section
      aria-label="Create slideshow"
      className="border-t border-[#c9d1ce] bg-[#f1f4f3]"
    >
      <div
        className={
          `mx-auto flex max-w-[1200px] flex-wrap items-center
          justify-between gap-x-6 gap-y-3 px-10 py-[18px]`
        }
      >
        <p className="m-0 text-sm text-[#56615e]">
          Nothing is stored. Download your slideshow or it&apos;s gone.
        </p>
        <Button
          variant="main"
          disabledReason={blocked ? "No frames collected" : undefined}
          onClick={onCreate}
        >
          Create slideshow
        </Button>
      </div>
    </section>
  );
};

export default CreateBar;
