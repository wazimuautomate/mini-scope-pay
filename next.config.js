/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/docs.php',
        destination: '/docs',
      },
    ];
  },
};

module.exports = nextConfig;
