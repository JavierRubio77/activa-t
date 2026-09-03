import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Activa’t",
  description: "Activitats, pes i progrés en un sol lloc.",
  applicationName: "Activa’t",
  appleWebApp: {
    capable: true,
    title: "Activa’t",
    statusBarStyle: "default",
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/icons/activat-v1-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/activat-v1-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/activat-v1-32.png",
    apple: [{ url: "/icons/activat-v1-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#174c3c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body>{children}</body>
    </html>
  );
}
