import type { Metadata } from "next";
import "./globals.css";
import { DashboardLayout } from "./dashboard-layout";

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
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
