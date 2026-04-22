export const postquery = `
*[_type == "post"] | order(publishedAt desc, _createdAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  _createdAt,
  excerpt,
  mainImage{
    asset,
    alt
  },
  author->{
    name,
    image{
      asset,
      alt
    }
  },
  categories[]->{
    title,
    slug
  }
}
`;

export const configQuery = `
*[_type == "siteconfig"][0] {
  title,
  description,
  url,
  openGraphImage{
    asset,
    alt
  }
}
`;

export const singlequery = `
*[_type == "post" && slug.current == $slug][0] {
  ...,
  author->,
  categories[]->,
  "estReadingTime": round(length(pt::text(body)) / 5 / 180 )
}
`;

export const pathquery = `
*[_type == "post"] {
  "slug": slug.current
}
`;

export const authorsquery = `
*[_type == "author"] {
  ...
}
`;

export const listquery = `
*[_type == "listing"] | order(_createdAt desc) [$start..$end] {
  ...,
  category->
}
`;

export const productquery = `
*[_type == "listing" && slug.current == $slug][0] {
  ...,
  category-> {
    ...,
    enqform->,
    vendorform->
  }
}
`;