import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const displaySerif = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodySans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "FARHAAANHILMY Studio",
  description: "Client Photo Selector & Project Management",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${displaySerif.variable} ${bodySans.variable} ${monoFont.variable}`}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
