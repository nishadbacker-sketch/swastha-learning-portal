import type { Metadata } from "next";
import "./globals.css";
import ProfileTopTab from "./components/profile-top-tab";

export const metadata: Metadata = {
  title: "Swastha Learning Portal",
  description: "A learning and development portal for families and educators."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ProfileTopTab />{children}</body>
    </html>
  );
}
