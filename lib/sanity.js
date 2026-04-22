import { createClient, usePreviewSubscription } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2023-01-01";

export const config = {
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production"
};

export const client = createClient(config);

export function getClient(preview = false) {
  return createClient({
    ...config,
    useCdn: !preview && process.env.NODE_ENV === "production",
  });
}

export { usePreviewSubscription };