/** @type {import('next').NextConfig} */
const nextConfig = {
  // mammoth and pdf-parse touch Node built-ins (fs/buffer internals) in ways
  // that don't play well with webpack's bundling of route handlers — keep
  // them as real Node "require" calls instead of bundling them.
  experimental: {
    serverComponentsExternalPackages: ["mammoth", "pdf-parse"],
  },
};

export default nextConfig;
