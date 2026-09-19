import YatraApp from "@/src/app";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title =
    slug[0] === "places" ? "Discover India" : slug[0].replace(/-/g, " ");
  return {
    title: `${title.charAt(0).toUpperCase() + title.slice(1)} | YATRA AI`,
    robots: {
      index: slug[0] === "explore" || slug[0] === "places",
      follow: true,
    },
  };
}
export default function Page() {
  return <YatraApp />;
}
