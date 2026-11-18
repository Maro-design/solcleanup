/** 512×512 PNG logo for structured data (Organization.logo) and anywhere SVG isn't accepted. */
import { ImageResponse } from "next/og";
import { OgMark } from "@/lib/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
        <OgMark size={512} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
