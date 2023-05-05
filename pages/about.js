import Container from "@components/container";
import Layout from "@components/layout";
import { authorsquery, configQuery } from "@lib/groq";
import { getClient } from "@lib/sanity";
import GetImage from "@utils/getImage";
import Image from "next/image";
import Link from "next/link";

export default function About({ authors, siteconfig }) {
  return (
    <Layout {...siteconfig}>
      <Container>
        <h1 className="mt-2 mb-3 text-3xl font-semibold tracking-tight text-center lg:leading-snug text-brand-primary lg:text-4xl dark:text-white">
          About
        </h1>
        <div className="text-center">
          <p className="text-lg">Blogging Los Angeles One Demolition Permit At A Time.</p>
        </div>

        <div className="grid grid-cols-3 gap-5 mt-6 mb-16 md:mt-16 md:mb-32 md:gap-16">
          {authors.slice(0, 3).map(author => {
            const { width, height, ...imgprops } = GetImage(
              author?.image
            );
            return (
              <div
                key={author._id}
                className="relative overflow-hidden rounded-md aspect-square odd:translate-y-10 odd:md:translate-y-16">
                <Image
                  {...imgprops}
                  alt={author.name || " "}
                  layout="fill"
                  objectFit="cover"
                  sizes="(max-width: 320px) 100vw, 320px"
                />
              </div>
            );
          })}
        </div>

        <div className="mx-auto prose text-center dark:prose-invert mt-14">
          <p>NATHAN MARSAK says: “I came to praise Los Angeles, not to bury her. And yet developers, City Hall and social reformers work in concert to effect wholesale demolition, removing the human scale of my town, tossing its charm into a landfill. The least I can do is memorialize in real time those places worth noting, as they slide inexorably into memory. In college I studied under Banham.&nbsp; I learned to love Los Angeles via Reyner’s teachings (and came to abjure Mike Davis and his lurid, fanciful, laughably-researched assertions).&nbsp; In grad school I focused on visionary urbanism and technological utopianism—so while some may find the premise of preserving communities so much ill-considered reactionary twaddle, at least I have a background in the other side. Anyway, I moved to Los Angeles, and began to document.&nbsp; I drove about <a href="https://amzn.to/2zGEatw">shooting neon signs</a>. I put endless miles across the Plains of Id on the old Packard as part of the 1947project; when Kim Cooper blogged about some <a href="http://1947project.blogspot.com/2005/10/are-you-going-to-eat-that.html" target="_blank" rel="noopener">bad lunch meat in Compton</a>, I drove down to there to check on the <a href="https://www.1947project.com/2005/10/17/augusta-mayo-to-day/" target="_blank" rel="noopener">scene of the crime</a> (never via freeway—you can’t really learn Los Angeles unless you study her from the surface streets).  But in short order one landmark after another disappeared.&nbsp; Few demolitions are as contentious or high profile as the Ambassador or Parker Center; rather, it is all the little houses and commercial buildings the social engineers are desperate to destroy in the name of the Greater Good.&nbsp; The fabric of our city is woven together by communities and neighborhoods who no longer have a say in their zoning or planning so it’s important to shine a light on these vanishing treasures, now, before the remarkable character of our city is wiped away like a stain from a countertop.&nbsp; (But Nathan, you say, <em>it’s just this one house</em>—no, it isn’t.&nbsp; Principiis obsta, finem respice.)  And who knows, one might even be saved.&nbsp; Excelsior!&#8221;&#8221;</p>
<p>Nathan&#8217;s blogs are: <a href="https://bunkerhilllosangeles.com/blog/" target="_blank" rel="noopener">Bunker Hill Los Angeles</a>, <a href="https://www.riplosangeles.com/" target="_blank" rel="noopener">RIP Los Angeles</a> &amp; <a href="https://www.onbunkerhill.org/" target="_blank" rel="noopener">On Bunker Hill</a>.</p>
          <p>
            <Link href="/contact">Get in touch</Link>
          </p>
        </div>
      </Container>
    </Layout>
  );
}

export async function getStaticProps({ params, preview = false }) {
  //console.log(params);
  const authors = await getClient(preview).fetch(authorsquery);
  const config = await getClient(preview).fetch(configQuery);
  return {
    props: {
      authors: authors,
      siteconfig: { ...config },
      preview
    },
    revalidate: 100
  };
}
