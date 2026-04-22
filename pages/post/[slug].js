import Image from "next/image";
import Link from "next/link";
import Layout from "@components/layout";
import Container from "@components/container";
import { useRouter } from "next/router";
import client, { getClient, usePreviewSubscription } from "@lib/sanity";
import ErrorPage from "next/error";
import GetImage from "@utils/getImage";
import { parseISO, format } from "date-fns";
import { NextSeo } from "next-seo";
import defaultOG from "/public/img/opengraph.jpg";
import { singlequery, configQuery, pathquery } from "@lib/groq";
import { PortableText } from "@portabletext/react";
import CategoryLabel from "@components/blog/category";
import AuthorCard from "@components/blog/authorCard";

const portableTextComponents = {
  types: {
    image: ({ value }) => {
      const src = GetImage(value);

      if (!src) return null;

      return (
        <figure className="my-6">
          <Image
            src={src}
            alt={value?.alt || "Post image"}
            width={1200}
            height={800}
            className="rounded-lg"
          />
          {value?.caption && (
            <figcaption className="mt-2 text-sm text-center text-gray-500">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    }
  }
};

export default function Post(props) {
  const { postdata, siteconfig, preview } = props;

  const router = useRouter();
  const { slug } = router.query;

  const { data: post } = usePreviewSubscription(singlequery, {
    params: { slug },
    initialData: postdata,
    enabled: preview || router.query.preview !== undefined
  });

  const { data: siteConfig } = usePreviewSubscription(configQuery, {
    initialData: siteconfig,
    enabled: preview || router.query.preview !== undefined
  });

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }

  const imageSrc = post?.mainImage ? GetImage(post.mainImage) : null;
  const authorImageSrc = post?.author?.image ? GetImage(post.author.image) : null;

  const ogimage = siteConfig?.openGraphImage
    ? GetImage(siteConfig.openGraphImage)
    : defaultOG.src;

  return (
    <>
      {post && siteConfig && (
        <Layout {...siteConfig}>
          <NextSeo
            title={`${post.title} - ${siteConfig.title}`}
            description={post.excerpt || ""}
            canonical={`${siteConfig?.url}/post/${post.slug.current}`}
            openGraph={{
              url: `${siteConfig?.url}/post/${post.slug.current}`,
              title: `${post.title} - ${siteConfig.title}`,
              description: post.excerpt || "",
              images: [
                {
                  url: imageSrc || ogimage,
                  width: 800,
                  height: 600,
                  alt: ""
                }
              ],
              site_name: siteConfig.title
            }}
            twitter={{
              cardType: "summary_large_image"
            }}
          />

          <Container className="!pt-0">
            <div className="max-w-screen-md mx-auto ">
              <div className="text-center">
                <CategoryLabel categories={post.categories} />
              </div>

              <h1 className="mt-2 mb-3 text-3xl font-semibold tracking-tight text-center lg:leading-snug text-brand-primary lg:text-4xl dark:text-white">
                {post.title}
              </h1>

              <div className="flex justify-center mt-3 space-x-3 text-gray-500 ">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0 w-10 h-10">
                    {authorImageSrc && (
                      <Image
                        src={authorImageSrc}
                        alt={post?.author?.name || "Author"}
                        objectFit="cover"
                        layout="fill"
                        className="rounded-full"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-400">
                      {post.author.name}
                    </p>
                    <div className="flex items-center space-x-2 text-sm">
                      <time
                        className="text-gray-500 dark:text-gray-400"
                        dateTime={post?.publishedAt || post._createdAt}
                      >
                        {format(
                          parseISO(post?.publishedAt || post._createdAt),
                          "MMMM dd, yyyy"
                        )}
                      </time>
                      <span>· {post.estReadingTime || "5"} min read</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>

          <div className="relative z-0 max-w-screen-lg mx-auto overflow-hidden lg:rounded-lg aspect-video">
            {imageSrc && (
              <Image
                src={imageSrc}
                alt={post.mainImage?.alt || "Thumbnail"}
                layout="fill"
                loading="eager"
                objectFit="cover"
              />
            )}
          </div>

          <Container>
            <article className="max-w-screen-md mx-auto ">
              <div className="mx-auto my-3 prose prose-base dark:prose-invert prose-a:text-blue-500">
                {post.body && (
                  <PortableText
                    value={post.body}
                    components={portableTextComponents}
                  />
                )}
              </div>
              <div className="flex justify-center mt-7 mb-7">
                <Link href="/">
                  <a className="px-5 py-2 text-sm text-blue-600 rounded-full dark:text-blue-500 bg-brand-secondary/20 ">
                    ← View all posts
                  </a>
                </Link>
              </div>
              {post.author && <AuthorCard author={post.author} />}
            </article>
          </Container>
        </Layout>
      )}
    </>
  );
}

export async function getStaticProps({ params, preview = false }) {
  const post = await getClient(preview).fetch(singlequery, {
    slug: params.slug
  });

  const config = await getClient(preview).fetch(configQuery);

  return {
    props: {
      postdata: { ...post },
      siteconfig: { ...config },
      preview
    },
    revalidate: 10
  };
}

export async function getStaticPaths() {
  const allPosts = await client.fetch(pathquery);

  return {
    paths:
      allPosts?.map(page => ({
        params: {
          slug: page.slug
        }
      })) || [],
    fallback: true
  };
}