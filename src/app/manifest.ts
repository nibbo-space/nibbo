import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nibbo",
    short_name: "Nibbo",
    description:
      "Завдання, календар родини, бюджет, нотатки, меню й список покупок — усе в одному затишному сервісі для всієї родини.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#f43f5e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
