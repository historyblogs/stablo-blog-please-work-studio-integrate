import { getClient } from "@lib/sanity";
import { pathquery } from "@lib/groq";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";

export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  try {
	const posts = [];    
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
  } catch (error) {
    console.error("sitemap error:", error);
    res.statusCode = 500;
    res.end("Error generating sitemap");
  }

  return { props: {} };
}