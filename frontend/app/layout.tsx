import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MirasExplorer",
    template: "%s | MirasExplorer",
  },
  description:
    "Taşınabilir kültürel miras eserlerini, sanatçıları, üretim geleneklerini, yerleri ve koleksiyonları keşfetmek için geliştirilmiş dijital kültürel miras platformu.",
  applicationName: "MirasExplorer",
  keywords: [
    "kültürel miras",
    "taşınabilir kültürel miras",
    "ebru sanatı",
    "hat sanatı",
    "tezhip",
    "minyatür",
    "kuyumculuk",
    "Osmanlı eserleri",
    "dijital müze",
    "kültür arşivi",
  ],
  authors: [
    {
      name: "MirasExplorer",
    },
  ],
  creator: "MirasExplorer",
  publisher: "MirasExplorer",
  category: "Cultural Heritage",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="tr">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}