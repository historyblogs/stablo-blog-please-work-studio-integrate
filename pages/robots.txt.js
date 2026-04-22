const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";

export default function RobotsTxt() {
  return null;
}

export async function getServerSideProps({ res }) {
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain");
  res.write(robotsTxt);
  res.end();

  return { props: {} };
}