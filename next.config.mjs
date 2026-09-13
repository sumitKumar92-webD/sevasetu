/** @type {import("next").NextConfig} */
const nextConfig = {
  // Mongoose + the dev-only in-memory MongoDB server must stay outside the bundle.
  serverExternalPackages: ["mongoose", "mongodb", "mongodb-memory-server-core"],
};

export default nextConfig;
