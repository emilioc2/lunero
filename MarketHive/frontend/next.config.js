/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from S3 and any configured CDN
    // Add your actual S3 bucket hostname here once configured
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
}

module.exports = nextConfig
