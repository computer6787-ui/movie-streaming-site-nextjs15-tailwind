/** @type {import('next').NextConfig} */
const nextConfig = {
  // The /adblock/extension route zips browser-extension/ at request time,
  // so the folder must survive Next's file tracing on deploy.
  outputFileTracingIncludes: {
    "/adblock/extension": ["./browser-extension/**/*"],
  },
};

export default nextConfig;
