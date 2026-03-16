import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LearningSpiral",
    short_name: "Spiral",
    description: "Capture ideas from text, images and voice, then refine them into reusable learning cards.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3efe2",
    theme_color: "#1c5c4c",
    lang: "fi",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ],
    share_target: {
      action: "/share/image",
      method: "post",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "image",
            accept: ["image/*", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"]
          }
        ]
      } as never
    }
  } as unknown as MetadataRoute.Manifest;
}
