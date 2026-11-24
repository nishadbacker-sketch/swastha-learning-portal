"use client";
import { useState } from "react";

export default function BrandLogo({ footer = false }: { footer?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span style={{ fontWeight: 800, color: "#12345a", fontSize: footer ? 18 : 14 }}>SWASTHA LEARNING CLINIC</span>;
  }
  return (
    <img
      src="/swastha-learning-clinic-logo.png"
      alt="Swastha Learning Clinic — Solutions For All Learning Difficulties"
      width={footer ? 310 : 240}
      height={footer ? 103 : 80}
      loading="eager"
      onError={() => setFailed(true)}
      style={{ width: footer ? "min(310px, 100%)" : "min(240px, 100%)", height: "auto", display: "block", objectFit: "contain" }}
    />
  );
}
