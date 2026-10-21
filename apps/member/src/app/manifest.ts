import type { MetadataRoute } from "next";

// What makes the portal installable on a phone's home screen. On iPhone, push
// notifications work only for an installed app (iOS 16.4 or later).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Prequate Table",
    short_name: "The Table",
    description: "Member portal for The Prequate Table.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#FBF7F0",
    theme_color: "#14120F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
