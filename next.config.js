module.exports = {
  images: {
    domains: ["cdn.sanity.io"],
    loader: "custom"
  },
  swcMinify: true,
  experimental: {
    legacyBrowsers: false,
    browsersListForSwc: true
  },
  async redirects() {
    return [
      {
        source: '/posts/test-post',
        destination: '/posts/will-nathan-fess-up',
        permanent: true,
      },
    ]
  }
};
