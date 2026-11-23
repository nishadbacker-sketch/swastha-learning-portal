import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swastha Learning Portal",
  description: "A learning and development portal for families and educators."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
