import CreateBar from "./CreateBar";
import FrameStrip from "./FrameStrip";
import { useWorkspace } from "./useWorkspace";
import VideoList from "./VideoList";
import Viewer from "./Viewer";

export const TAGLINE =
  "Welcome to Shotlify. Capture frames from your videos " +
  "and create slideshows with them.";

/* The light-table workspace from the design canvas: viewer and video list
 * side by side (stacking on narrow screens), the frame strip below, and
 * the create bar at the bottom. Layout only; state lives in useWorkspace.
 * Lives here, not in src/pages/, because every file under pages/ becomes
 * a route (a spec there would ship as a page). Must be inside
 * AnnounceProvider. */
const Workspace = (): JSX.Element => {
  const workspace = useWorkspace();

  return (
    <div className="flex min-h-screen flex-col">
      <div
        className={
          `mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-7
          px-4 pt-8 pb-10 sm:px-10`
        }
      >
        <header className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
          <h1 className="m-0 font-display text-5xl leading-none font-light">
            Shotlify
          </h1>
          <p className="m-0 text-[#56615e]">{TAGLINE}</p>
        </header>

        <main className="flex flex-col gap-7">
          <div className="flex flex-wrap items-start gap-8">
            <div className="min-w-0 flex-[999_1_560px]">
              <Viewer
                video={workspace.selectedVideo}
                onCapture={workspace.capture}
              />
            </div>
            <div className="min-w-0 flex-[1_1_240px]">
              <VideoList
                videos={workspace.videos}
                selectedId={workspace.selectedVideoId}
                onSelect={workspace.selectVideo}
                onAdd={workspace.addVideos}
                onRemove={workspace.removeVideo}
              />
            </div>
          </div>

          <FrameStrip
            frames={workspace.frames}
            onMove={workspace.moveFrame}
            onRemove={workspace.removeFrame}
            onAddPhotos={workspace.addPhotos}
          />
        </main>
      </div>

      {/* No-op until slice 5 connects the render API. */}
      <CreateBar
        frameCount={workspace.frames.length}
        onCreate={() => undefined}
      />
    </div>
  );
};

export default Workspace;
