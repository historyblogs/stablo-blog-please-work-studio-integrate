import Image from "next/image";
import {
  createClient,
  createPreviewSubscriptionHook
} from "next-sanity";
import createImageUrlBuilder from "@sanity/image-url";
import { PortableText as PortableTextComponent } from "@portabletext/react";
import { config } from "./config";
import GetImage from "@utils/getImage";

if (!config.projectId) {
  throw Error(
    "The Project ID is not set. Check your environment variables."
  );
}

export const urlFor = source =>
  createImageUrlBuilder(config).image(source);

export const imageBuilder = source =>
  createImageUrlBuilder(config).image(source);

export const usePreviewSubscription =
  createPreviewSubscriptionHook(config);

const ImageComponent = ({ value }) => {
  const src = GetImage(value);

  if (!src) return null;

  return (
    <Image
      src={src}
      alt={value?.alt || " "}
      width={1000}
      height={800}
      sizes="(max-width: 800px) 100vw, 800px"
    />
  );
};

const components = {
  types: {
    image: ImageComponent,
    code: props => (
      <pre data-language={props.node.language}>
        <code>{props.node.code}</code>
      </pre>
    )
  },
  marks: {
    center: props => (
      <div className="text-center">{props.children}</div>
    ),
    highlight: props => (
      <span className="font-bold text-brand-primary">
        {props.children}
      </span>
    ),
    link: props => (
      <a href={props?.value?.href} target="_blank" rel="noopener">
        {props.children}
      </a>
    )
  }
};

export const PortableText = props => (
  <PortableTextComponent components={components} {...props} />
);

export const client = createClient(config);

export const previewClient = createClient({
  ...config,
  useCdn: false
});

export const getClient = usePreview =>
  usePreview ? previewClient : client;

export default client;