import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = new URL(
    `${host.startsWith("localhost") ? "http" : "https"}://${host}`,
  );
  const description =
    "Safe check-in, vehicle tracking and disruption operations for Reise.";
  return {
    metadataBase: origin,
    title: "Reise Driver Operations",
    description,
    openGraph: {
      title: "Reise",
      description,
      images: [
        {
          url: "/og.png",
          width: 1728,
          height: 908,
          alt: "Reise passenger and driver operations product",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Reise",
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
