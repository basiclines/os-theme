import "./index.css";
import { Composition } from "remotion";
import { OsThemeIntro } from "./OsThemeIntro";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OsThemeIntro"
        component={OsThemeIntro}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
