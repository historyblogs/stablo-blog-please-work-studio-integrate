import { createClient, createPreviewSubscriptionHook } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2023-01-01";

const config = {
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production"
};

const client = createClient(config);

export const usePreviewSubscription = createPreviewSubscriptionHook({
  projectId,
  dataset
});

export { client };

export default client;

export function getClient(preview = false) {
  return createClient({
    ...config,
    useCdn: !preview && process.env.NODE_ENV === "production"
  });
}