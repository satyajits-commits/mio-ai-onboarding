/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bundle the sample prerequisite files so the Ops import works in serverless.
  experimental: {
    outputFileTracingIncludes: {
      "/api/**": ["./prereqs-jecrc.xlsx", "./lpu-prompt.docx"],
    },
  },
};

export default nextConfig;
