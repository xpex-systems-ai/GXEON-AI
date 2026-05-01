import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GXEON Dashboard",
  description: "Real-time revenue and commission tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* CRITICAL: Always render children, never empty */}
        {children}
        {/* FALLBACK: Ensure something always renders */}
        <div id="fallback-ui" style={{ display: 'none' }}>
          GXEON SYSTEM LOADING...
        </div>
      </body>
    </html>
  );
}
