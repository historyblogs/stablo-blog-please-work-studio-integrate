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
      {
        source: '/let-s-talk-about-taix',
        destination: '/post/let-s-talk-about-taix',
        permanent: true,
      },
{
        source: '/pacific-bowling-center-dancing-waters-club-1331-south-pacific-avenue-san-pedro-1940',
        destination: '/post/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave',
        permanent: true,
      },
{
        source: '/371-77-n-st-andrews',
        destination: '/post/371-377-north-st-andrews-place',
        permanent: true,
      },
{
        source: '/and-were-back',
        destination: '/post/and-we-re-back',
        permanent: true,
      },
{
        source: '/the-house-of-spirits',
        destination: '/post/the-house-of-spirits',
        permanent: true,
      },
{
        source: '/1723-n-wilcox-ave',
        destination: '/post/1723-n-wilcox-ave',
        permanent: true,
      },
{
        source: '/the-face-of-the-ellis-act',
        destination: '/post/the-face-of-the-ellis-act',
        permanent: true,
      },
{
        source: '/how-we-do-our-demolitions',
        destination: '/post/how-we-do-our-demolitions',
        permanent: true,
      },
{
        source: '/226-n-berendo-st',
        destination: '/post/226-n-berendo-st',
        permanent: true,
      },
{
        source: '/what-in-the-actual-hell-los-angeles',
        destination: '/post/what-in-the-actual-hell-los-angeles',
        permanent: true,
      },
{
        source: '/magnolia-update',
        destination: '/post/magnolia-update',
        permanent: true,
      },
{
        source: '/10555-bloomfield-street-toluca-lake',
        destination: '/post/10555-bloomfield-street-toluca-lake',
        permanent: true,
      },
{
        source: '/so-ugly-too-ugly',
        destination: '/post/so-ugly-too-ugly',
        permanent: true,
      },
{
        source: '/on-another-note',
        destination: '/post/on-another-note',
        permanent: true,
      },
{
        source: '/1844-n-alexandria-ave',
        destination: '/post/1844-n-alexandria-ave',
        permanent: true,
      },
{
        source: '/3755-s-canfield-ave-palms',
        destination: '/post/3755-s-canfield-ave-palms',
        permanent: true,
      },
{
        source: '/13921-vanowen-st-van-nuys',
        destination: '/post/13921-vanowen-st-van-nuys',
        permanent: true,
      },
    ]
  }
};
