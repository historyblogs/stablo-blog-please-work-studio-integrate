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
        source: '/post/test-post',
        destination: '/post/will-nathan-fess-up',
        permanent: true,
      },
      {
        source: '/let-s-talk-about-taix',
        destination: '/post/let-s-talk-about-taix',
        permanent: true,
      },
    ]
  }
};
