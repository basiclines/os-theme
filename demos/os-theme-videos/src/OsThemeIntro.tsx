import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

// Platform color schemes
const platforms = {
  macos: {
    name: "macOS",
    icon: "",
    accent: "#0071e3",
    accentLight: "#64b5f6",
    darkBg: "#1c1c1e",
    lightBg: "#f5f5f7",
    darkEditor: {
      bg: "#1e1e1e",
      text: "#d4d4d4",
      keyword: "#c586c0",
      str: "#ce9178",
      fn: "#dcdcaa",
      comment: "#6a9955",
      punct: "#d4d4d4",
      titleBarText: "#8b8b8b",
      terminalLabel: "#8b8b8b",
      terminalText: "#569cd6",
      border: "#333333",
      shadow: "0 25px 60px rgba(0,0,0,0.5)",
    },
    lightEditor: {
      bg: "#ffffff",
      text: "#1e1e1e",
      keyword: "#af00db",
      str: "#a31515",
      fn: "#795e26",
      comment: "#008000",
      punct: "#1e1e1e",
      titleBarText: "#8b8b8b",
      terminalLabel: "#8b8b8b",
      terminalText: "#0451a5",
      border: "#e0e0e0",
      shadow: "0 25px 60px rgba(0,0,0,0.1)",
    },
    titleBar: "macos" as const,
  },
  windows: {
    name: "Windows",
    icon: "",
    accent: "#0078d4",
    accentLight: "#60cdff",
    darkBg: "#202020",
    lightBg: "#f3f3f3",
    darkEditor: {
      bg: "#1e1e1e",
      text: "#cccccc",
      keyword: "#569cd6",
      str: "#ce9178",
      fn: "#dcdcaa",
      comment: "#6a9955",
      punct: "#cccccc",
      titleBarText: "#969696",
      terminalLabel: "#969696",
      terminalText: "#9cdcfe",
      border: "#2d2d2d",
      shadow: "0 8px 32px rgba(0,0,0,0.6)",
    },
    lightEditor: {
      bg: "#ffffff",
      text: "#1e1e1e",
      keyword: "#0000ff",
      str: "#a31515",
      fn: "#795e26",
      comment: "#008000",
      punct: "#1e1e1e",
      titleBarText: "#616161",
      terminalLabel: "#616161",
      terminalText: "#0451a5",
      border: "#d4d4d4",
      shadow: "0 8px 32px rgba(0,0,0,0.08)",
    },
    titleBar: "windows" as const,
  },
  linux: {
    name: "Linux",
    icon: "",
    accent: "#e95420",
    accentLight: "#ff8a50",
    darkBg: "#2c001e",
    lightBg: "#faf7f5",
    darkEditor: {
      bg: "#300a24",
      text: "#e0e0e0",
      keyword: "#ad7fa8",
      str: "#4e9a06",
      fn: "#729fcf",
      comment: "#75715e",
      punct: "#e0e0e0",
      titleBarText: "#8b8b8b",
      terminalLabel: "#8b8b8b",
      terminalText: "#34e2e2",
      border: "#49243a",
      shadow: "0 25px 60px rgba(0,0,0,0.5)",
    },
    lightEditor: {
      bg: "#ffffff",
      text: "#2e3436",
      keyword: "#75507b",
      str: "#4e9a06",
      fn: "#3465a4",
      comment: "#8f5902",
      punct: "#2e3436",
      titleBarText: "#6e7781",
      terminalLabel: "#6e7781",
      terminalText: "#3465a4",
      border: "#d3d7cf",
      shadow: "0 25px 60px rgba(0,0,0,0.08)",
    },
    titleBar: "linux" as const,
  },
};

type EditorTheme = typeof platforms.macos.darkEditor;
const EditorThemeContext = React.createContext<EditorTheme>(platforms.macos.darkEditor);

const CodeLine: React.FC<{
  children: React.ReactNode;
  delay: number;
  indent?: number;
}> = ({ children, delay, indent = 0 }) => {
  const frame = useCurrentFrame();
  const theme = React.useContext(EditorThemeContext);

  const opacity = interpolate(frame - delay, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame - delay, [0, 8], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        marginLeft: indent * 24,
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        fontSize: 24,
        lineHeight: 1.8,
        color: theme.text,
      }}
    >
      {children}
    </div>
  );
};

const SyntaxHighlight: React.FC<{
  keyword?: string;
  str?: string;
  fn?: string;
  comment?: string;
  normal?: string;
  punct?: string;
}> = ({ keyword, str, fn, comment, normal, punct }) => {
  const theme = React.useContext(EditorThemeContext);
  if (keyword) return <span style={{ color: theme.keyword }}>{keyword}</span>;
  if (str) return <span style={{ color: theme.str }}>{str}</span>;
  if (fn) return <span style={{ color: theme.fn }}>{fn}</span>;
  if (comment) return <span style={{ color: theme.comment }}>{comment}</span>;
  if (punct) return <span style={{ color: theme.punct }}>{punct}</span>;
  return <span style={{ color: theme.text }}>{normal}</span>;
};

// Title bar styles per platform
const TitleBar: React.FC<{
  type: "macos" | "windows" | "linux";
  editorTheme: EditorTheme;
}> = ({ type, editorTheme }) => {
  if (type === "macos") {
    return (
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: 12, color: editorTheme.titleBarText, fontSize: 14, fontFamily: "'SF Mono', monospace" }}>
          app.ts
        </span>
      </div>
    );
  }
  if (type === "windows") {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <span style={{ color: editorTheme.titleBarText, fontSize: 14, fontFamily: "'Segoe UI', sans-serif" }}>
          app.ts — os-theme
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <div style={{ width: 36, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: editorTheme.titleBarText, fontSize: 11 }}>─</div>
          <div style={{ width: 36, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: editorTheme.titleBarText, fontSize: 11 }}>□</div>
          <div style={{ width: 36, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: editorTheme.titleBarText, fontSize: 11 }}>✕</div>
        </div>
      </div>
    );
  }
  // linux
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
      <span style={{ color: editorTheme.titleBarText, fontSize: 14, fontFamily: "'Ubuntu Mono', monospace" }}>
        app.ts — Terminal
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${editorTheme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: editorTheme.titleBarText, fontSize: 9 }}>─</div>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${editorTheme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: editorTheme.titleBarText, fontSize: 9 }}>□</div>
        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${editorTheme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: editorTheme.titleBarText, fontSize: 9 }}>✕</div>
      </div>
    </div>
  );
};

// Reusable platform scene
const PlatformScene: React.FC<{
  platform: typeof platforms.macos;
}> = ({ platform }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const toggleFrame = 90;

  const bgTransition = interpolate(
    frame,
    [toggleFrame - 5, toggleFrame + 5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const isLight = bgTransition > 0.5;
  const currentBg = isLight ? platform.lightBg : platform.darkBg;
  const editorTheme = isLight ? platform.lightEditor : platform.darkEditor;

  const outputOpacity1 = interpolate(frame, [45, 53], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outputOpacity2 = interpolate(frame, [toggleFrame + 10, toggleFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseScale = frame > toggleFrame && frame < toggleFrame + 20
    ? interpolate(frame - toggleFrame, [0, 10, 20], [1, 1.02, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Platform label entrance
  const labelSpring = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        background: currentBg,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Platform label */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${labelSpring})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 28px",
            borderRadius: 24,
            background: `${platform.accent}22`,
            border: `1px solid ${platform.accent}44`,
          }}
        >
          <span style={{ fontSize: 28 }}>{platform.icon}</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: platform.accent,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {platform.name}
          </span>
        </div>
      </div>

      <EditorThemeContext.Provider value={editorTheme}>
        {/* Code editor */}
        <div
          style={{
            width: "100%",
            maxWidth: 960,
            background: editorTheme.bg,
            borderRadius: platform.titleBar === "windows" ? 0 : 12,
            padding: 36,
            boxShadow: editorTheme.shadow,
            transform: `scale(${pulseScale})`,
            border: platform.titleBar === "windows" ? `1px solid ${editorTheme.border}` : "none",
          }}
        >
          <TitleBar type={platform.titleBar} editorTheme={editorTheme} />

          {/* Code */}
          <CodeLine delay={5}>
            <SyntaxHighlight keyword="import" />{" "}
            <SyntaxHighlight punct="{" />{" "}
            <SyntaxHighlight normal="appearance" />{" "}
            <SyntaxHighlight punct="}" />{" "}
            <SyntaxHighlight keyword=" from " />
            <SyntaxHighlight str={`"os-theme"`} />
          </CodeLine>

          <div style={{ height: 12 }} />

          <CodeLine delay={12}>
            <SyntaxHighlight comment="// Listen for changes" />
          </CodeLine>
          <CodeLine delay={17}>
            <SyntaxHighlight fn="appearance" />
            <SyntaxHighlight punct="." />
            <SyntaxHighlight fn="on" />
            <SyntaxHighlight punct="(" />
            <SyntaxHighlight str={`"change"`} />
            <SyntaxHighlight punct=", " />
            <SyntaxHighlight punct="(" />
            <SyntaxHighlight normal="mode" />
            <SyntaxHighlight punct=")" />
            <SyntaxHighlight keyword=" => " />
            <SyntaxHighlight punct="{" />
          </CodeLine>
          <CodeLine delay={22} indent={1}>
            <SyntaxHighlight normal="console" />
            <SyntaxHighlight punct="." />
            <SyntaxHighlight fn="log" />
            <SyntaxHighlight punct="(" />
            <SyntaxHighlight str={`"Theme:"`} />
            <SyntaxHighlight punct=", " />
            <SyntaxHighlight normal="mode" />
            <SyntaxHighlight punct=")" />
          </CodeLine>
          <CodeLine delay={27}>
            <SyntaxHighlight punct="})" />
          </CodeLine>

          {/* Terminal output */}
          <div
            style={{
              marginTop: 20,
              borderTop: `1px solid ${editorTheme.border}`,
              paddingTop: 14,
            }}
          >
            <div
              style={{
                color: editorTheme.terminalLabel,
                fontSize: 13,
                fontFamily: "'SF Mono', monospace",
                marginBottom: 8,
              }}
            >
              Terminal
            </div>

            {frame > 45 && (
              <div
                style={{
                  opacity: outputOpacity1,
                  fontFamily: "'SF Mono', monospace",
                  fontSize: 20,
                  color: editorTheme.terminalText,
                }}
              >
                ▸ Theme: <span style={{ color: isLight ? editorTheme.str : editorTheme.fn, fontWeight: 700 }}>dark</span>{" "}
                <span style={{ color: editorTheme.comment }}></span>
              </div>
            )}

            {frame > toggleFrame + 10 && (
              <div
                style={{
                  opacity: outputOpacity2,
                  fontFamily: "'SF Mono', monospace",
                  fontSize: 20,
                  color: editorTheme.terminalText,
                  marginTop: 4,
                }}
              >
                ▸ Theme: <span style={{ color: isLight ? editorTheme.keyword : editorTheme.str, fontWeight: 700 }}>light</span>{" "}
                <span style={{ color: editorTheme.comment }}></span>
              </div>
            )}
          </div>
        </div>
      </EditorThemeContext.Provider>

      {/* Theme changed notification */}
      {frame > toggleFrame && frame < toggleFrame + 40 && (
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 40,
            background: `linear-gradient(135deg, ${platform.accent}, ${platform.accentLight})`,
            color: "white",
            padding: "10px 24px",
            borderRadius: 10,
            fontSize: 18,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 600,
            opacity: interpolate(
              frame - toggleFrame,
              [0, 5, 30, 40],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            boxShadow: `0 8px 24px ${platform.accent}66`,
          }}
        >
          Theme changed!
        </div>
      )}
    </AbsoluteFill>
  );
};

export const OsThemeIntro: React.FC = () => {
  const sceneDuration = 150; // 5s per platform at 30fps

  return (
    <AbsoluteFill>
      {/* macOS (0-5s) */}
      <Sequence from={0} durationInFrames={sceneDuration}>
        <PlatformScene platform={platforms.macos} />
      </Sequence>

      {/* Windows (5-10s) */}
      <Sequence from={sceneDuration} durationInFrames={sceneDuration}>
        <PlatformScene platform={platforms.windows} />
      </Sequence>

      {/* Linux (10-15s) */}
      <Sequence from={sceneDuration * 2} durationInFrames={sceneDuration}>
        <PlatformScene platform={platforms.linux} />
      </Sequence>
    </AbsoluteFill>
  );
};
