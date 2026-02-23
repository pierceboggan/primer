import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

/**
 * Animation frames for the PRIMER banner fly-in effect.
 * Uses frame-based architecture from GitHub Copilot CLI patterns.
 * ~75ms per frame = ~13fps (optimal for terminal rendering).
 */

// The final banner text
const FULL_BANNER = [
  "██████╗ ██████╗ ██╗███╗   ███╗███████╗██████╗ ",
  "██╔══██╗██╔══██╗██║████╗ ████║██╔════╝██╔══██╗",
  "██████╔╝██████╔╝██║██╔████╔██║█████╗  ██████╔╝",
  "██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██╔══╝  ██╔══██╗",
  "██║     ██║  ██║██║██║ ╚═╝ ██║███████╗██║  ██║",
  "╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝",
];

// Animation frames - slide in from right with progressive reveal
const generateFrames = (): string[][] => {
  const frames: string[][] = [];
  const width = FULL_BANNER[0].length;
  
  // Frame 0-4: Empty -> sparkles appearing
  frames.push(["", "", "", "", "", ""]);
  frames.push(["", "", "    ✦", "", "", ""]);
  frames.push(["  ✦", "", "    ✦  ✧", "", "      ✦", ""]);
  
  // Frame 5-15: Slide in from right
  for (let offset = width; offset >= 0; offset -= 4) {
    const frame = FULL_BANNER.map(line => {
      if (offset >= line.length) return "";
      return " ".repeat(Math.max(0, offset)) + line.slice(0, Math.max(0, line.length - offset));
    });
    frames.push(frame);
  }
  
  // Final frame: Full banner
  frames.push([...FULL_BANNER]);
  
  return frames;
};

const FRAMES = generateFrames();
const FRAME_DURATION = 75; // ~13fps

// Semantic color roles for theme compatibility (4-bit ANSI)
type ColorRole = "primary" | "accent" | "sparkle";

const THEME_DARK: Record<ColorRole, string> = {
  primary: "magentaBright",
  accent: "cyanBright",
  sparkle: "yellowBright",
};

const THEME_LIGHT: Record<ColorRole, string> = {
  primary: "magenta",
  accent: "cyan", 
  sparkle: "yellow",
};

type AnimatedBannerProps = {
  onComplete?: () => void;
  skipAnimation?: boolean;
  darkMode?: boolean;
};

export function AnimatedBanner({ 
  onComplete, 
  skipAnimation = false,
  darkMode = true,
}: AnimatedBannerProps): React.JSX.Element {
  const [frameIndex, setFrameIndex] = useState(skipAnimation ? FRAMES.length - 1 : 0);
  const [isComplete, setIsComplete] = useState(skipAnimation);
  
  const theme = darkMode ? THEME_DARK : THEME_LIGHT;

  useEffect(() => {
    if (skipAnimation || isComplete) return;

    const interval = setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1;
        if (next >= FRAMES.length) {
          clearInterval(interval);
          setIsComplete(true);
          return FRAMES.length - 1;
        }
        return next;
      });
    }, FRAME_DURATION);

    return () => clearInterval(interval);
  }, [skipAnimation, isComplete]);

  // Call onComplete in a separate effect to avoid setState during render
  useEffect(() => {
    if (isComplete && !skipAnimation) {
      onComplete?.();
    }
  }, [isComplete, skipAnimation, onComplete]);

  const currentFrame = FRAMES[frameIndex];
  const showSparkles = frameIndex < 3;

  return (
    <Box flexDirection="column">
      {currentFrame.map((line, i) => (
        <Text 
          key={i} 
          color={showSparkles && line.includes("✦") ? theme.sparkle : theme.primary} 
          bold={!showSparkles}
        >
          {line || " "}
        </Text>
      ))}
    </Box>
  );
}

/**
 * Static banner for use after animation or when animation is disabled.
 * When accessible=true, renders plain text instead of block art.
 */
export function StaticBanner({ darkMode = true, accessible = false }: { darkMode?: boolean; accessible?: boolean }): React.JSX.Element {
  const color = darkMode ? "magentaBright" : "magenta";

  if (accessible) {
    return (
      <Box flexDirection="column">
        <Text color={color} bold>PRIMER</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {FULL_BANNER.map((line, i) => (
        <Text key={i} color={color} bold>
          {line}
        </Text>
      ))}
    </Box>
  );
}
