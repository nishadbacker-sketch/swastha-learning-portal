import type { Metadata } from "next";
import "./globals.css";
import ProfileTopTab from "./components/profile-top-tab";
import BrandLogo from "./components/brand-logo";

export const metadata: Metadata = {
  title: "Swastha Learning Portal",
  description: "A learning and development portal for families and educators."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ProfileTopTab />{children}<footer style={{padding:"24px 16px",background:"#f8faf7",borderTop:"1px solid #dce8e1",display:"flex",justifyContent:"center"}}><BrandLogo footer /></footer></body>
    </html>
  );
}
