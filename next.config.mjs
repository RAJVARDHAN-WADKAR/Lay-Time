/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "better-sqlite3",
      "pdf-parse",
      "pdfjs-dist",
      "tesseract.js",
      "@tesseract.js-data/eng",
      "@napi-rs/canvas",
      "date-holidays"
    ],
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;