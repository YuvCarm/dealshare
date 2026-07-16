import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DealShare",
  description: "Track deals and share them with co-investors.",
};

// Runs before the page paints, so the saved theme is applied with no flash of
// the wrong one. `dark` is the default (it's already on <html> below), so we
// only ever need to REMOVE it for someone who chose light — anyone else keeps
// the class the server sent. Wrapped in try/catch because localStorage throws
// in some privacy modes; failing there just leaves the default dark.
const themeScript = `
try {
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the script above may strip `dark` before React
    // hydrates, so the class it sees can differ from the server's — expected,
    // and only ever on this one element.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
