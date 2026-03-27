const { withTamagui } = require('@tamagui/next-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lunero/ui', '@lunero/core', '@lunero/api-client'],
};

module.exports = withTamagui({
  config: './tamagui.config.ts',
  components: ['@lunero/ui'],
  importsWhitelist: ['constants.js', 'colors.js'],
  logTimings: true,
  disableExtraction: process.env.NODE_ENV === 'development',
})(nextConfig);
