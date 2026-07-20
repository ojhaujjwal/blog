import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { generateOgImageForPost } from "@utils/generateOgImages";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map(({ slug }) => ({ params: { slug } }));
}

export const GET: APIRoute = async ({ params }) => {
  const posts = await getCollection("blog");
  const post = posts.find(p => p.slug === params.slug);
  if (!post) return new Response(null, { status: 404 });
  return new Response(await generateOgImageForPost(post), {
    headers: { "Content-Type": "image/png" },
  });
};
