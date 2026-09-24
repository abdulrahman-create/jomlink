import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display / headline typeface — modern, approachable, confident.
const soraDisplay = Sora({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Jomlink — Marketplace for Business Introductions",
    template: "%s · Jomlink",
  },
  description:
    "Jomlink is a trusted marketplace for business introductions. Connect with people who can legitimately open the right doors.",
  keywords: ["business introductions", "networking", "marketplace", "Jomlink", "connections"],
  metadataBase: new URL("http://localhost:3000"),
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Jomlink — Marketplace for Business Introductions",
    description:
      "Connect with people who can help you reach the right people, organisations and opportunities.",
    type: "website",
    images: ["/jomlink-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${soraDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
