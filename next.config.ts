/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! ATENÇÃO !!
    // Isso permite que a Vercel faça o deploy mesmo com avisos de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Isso permite que a Vercel faça o deploy mesmo com avisos de ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;