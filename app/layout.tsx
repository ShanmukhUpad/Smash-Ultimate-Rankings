import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smash Ultimate Rankings",
  description:
    "A personal skill ranking of all 86 Smash Ultimate fighters compared against the competitive tier list.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
