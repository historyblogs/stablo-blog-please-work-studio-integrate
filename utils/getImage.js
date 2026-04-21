import client from "@lib/sanity";
import imageUrlBuilder from "@sanity/image-url";

const builder = imageUrlBuilder(client);

export default function GetImage(image, CustomImageBuilder = null) {
  if (!image || !image.asset) {
    return null;
  }

  let imageBuilder = builder.image(image);

  if (CustomImageBuilder) {
    imageBuilder = CustomImageBuilder(imageBuilder);
  }

  return imageBuilder.url();
}