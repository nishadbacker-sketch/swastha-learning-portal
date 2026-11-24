import type { Metadata } from "next";
import "./globals.css";
import MainWebsiteFooter from "./components/main-website-footer";

export const metadata: Metadata = {
  title: "Swastha Learning Portal",
  description: "A learning and development portal for families and educators."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<MainWebsiteFooter /></body>
    </html>
  );
}
