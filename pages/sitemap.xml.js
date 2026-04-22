import { getClient } from "@lib/sanity";
import { pathquery } from "@lib/groq";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";

export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  let posts = [];

  try {
    posts = await getClient(false).fetch(pathquery);
  } catch (error) {
    console.error("sitemap fetch error:", error);
  }

  const safePosts = Array.isArray(posts) ? posts : [];
  const urls = [`${siteUrl}/`, `${siteUrl}/archive`];

  safePosts
    .filter(page => typeof page?.slug === "string" && page.slug.length > 0)
    .forEach(page => {
      urls.push(`${siteUrl}/post/${page.slug}`);
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map(
      url =>
        `<url><loc>${url}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    )
    .join("\n  ")}
</urlset>`;

  res.setHeader("Content-Type", "text/xml");
  res.write(xml);
  res.end();

  return { props: {} };
}