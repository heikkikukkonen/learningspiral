import { ImageResponse } from "next/og";

export const runtime = "edge";

function parseSize(rawValue: string): 192 | 512 {
  return rawValue === "512" ? 512 : 192;
}

function buildIcon(size: 192 | 512) {
  const scale = size / 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "linear-gradient(145deg, #fbf7fb 0%, #f3f8fe 52%, #eef6f4 100%)",
          borderRadius: 112 * scale
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 360 * scale,
            height: 360 * scale,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,224,139,0.9) 0%, rgba(255,224,139,0.18) 38%, rgba(255,224,139,0) 72%)"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 404 * scale,
            height: 404 * scale,
            borderRadius: "50%",
            border: `${18 * scale}px solid rgba(127, 201, 218, 0.95)`,
            boxSizing: "border-box"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 292 * scale,
            height: 292 * scale,
            borderRadius: "50%",
            border: `${14 * scale}px solid rgba(147, 215, 198, 0.95)`,
            boxSizing: "border-box"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 174 * scale,
            height: 174 * scale,
            borderRadius: "50%",
            background: "#fff9c9",
            boxShadow: `0 0 ${44 * scale}px rgba(255, 224, 139, 0.55)`
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 98 * scale,
            right: 102 * scale,
            width: 74 * scale,
            height: 112 * scale,
            borderRadius: 9999,
            borderLeft: `${12 * scale}px solid #7db756`,
            transform: "rotate(-8deg)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 152 * scale,
            right: 64 * scale,
            width: 84 * scale,
            height: 52 * scale,
            background: "#aee277",
            border: `${6 * scale}px solid #8ac55d`,
            borderRadius: `${52 * scale}px ${52 * scale}px ${40 * scale}px ${40 * scale}px`,
            transform: "rotate(-18deg)"
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 176 * scale,
            right: 106 * scale,
            width: 92 * scale,
            height: 56 * scale,
            background: "#bce985",
            border: `${6 * scale}px solid #8ac55d`,
            borderRadius: `${52 * scale}px ${52 * scale}px ${40 * scale}px ${40 * scale}px`,
            transform: "rotate(14deg)"
          }}
        />
      </div>
    ),
    {
      width: size,
      height: size
    }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { size: string } }
) {
  const size = parseSize(params.size);
  return buildIcon(size);
}
