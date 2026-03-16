import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
      title: "title",
      text: "text",
      files: [
        {
          name: "image",
          accept: ["image/*"]
        }
      ]
    }
  };
}
