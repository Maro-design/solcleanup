import type { CSSProperties, FC, HTMLAttributes } from "react";

export interface GradientASCIIProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  colors?: string[];
  shape?: "horizon" | "pinch" | "rise" | "eclipse";
  characters?: string;
  cellSize?: number;
  density?: number;
  glyphOpacity?: number;
  gradientOpacity?: number;
  glow?: number;
  depthOfField?: number;
  flicker?: number;
  softness?: number;
  scale?: number;
  flow?: number;
  speed?: number;
  grain?: number;
  variation?: number;
  mouseInteraction?: boolean;
  scrambleRadius?: number;
  clickEffect?: "wave" | "burst" | "none";
  intro?: boolean;
  lightMode?: boolean;
  fontFamily?: string;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

declare const GradientASCII: FC<GradientASCIIProps>;
export default GradientASCII;
