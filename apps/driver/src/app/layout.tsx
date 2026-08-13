import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reise Driver Operations",
  description: "Safe check-in, vehicle tracking and disruption operations for Reise.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
