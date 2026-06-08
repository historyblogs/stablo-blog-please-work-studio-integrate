import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Home',
      href: getPermalink('/'),
    },
    {
      text: 'About',
      href: getPermalink('/about'),
    },
    {
      text: 'Contact',
      href: getPermalink('/contact'),
    },
    {
      text: 'Map',
      href: getPermalink('/map'),
    },
    {
      text: 'Bunker Hill Los Angeles Institute',
      href: 'https://bunkerhilllosangeles.com',
      target: '_blank',
    },
    {
      text: 'Esotouric',
      href: 'https://esotouric.com',
      target: '_blank',
    },
    {
      icon: 'tabler:search',
      ariaLabel: 'Search',
      href: getPermalink('/search'),
    },
    {
      icon: 'tabler:rss',
      ariaLabel: 'RSS Feed',
      href: getAsset('/rss.xml'),
    },
  ],
  actions: [],
};

export const footerData = {
  links: [],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
  ],
  footNote: `© ${new Date().getFullYear()} RIP Los Angeles. All rights reserved.`,
};
