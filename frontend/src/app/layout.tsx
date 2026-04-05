import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Audit",
  description: "AI-powered Schema.org JSON-LD structured data recommender",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}