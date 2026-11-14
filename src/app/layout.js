import "./globals.css";
import Header from "@/components/Header";

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
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@600;700;800&display=swap"
        />
      </head>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
