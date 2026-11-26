"use client";

import type { CSSProperties } from "react";

type StaffMetricCardProps = {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
};

const panel: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dce8e1",
  borderRadius: 13,
  padding: 16,
  boxShadow: "0 3px 14px rgba(24,58,53,0.04)",
};

/** Shared summary-card presentation for all staff dashboards. */
export default function StaffMetricCard({ label, value, color, onClick }: StaffMetricCardProps) {
  const body = (
    <>
      <div style={{ color: "#667a74", fontSize: 13, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 27, fontWeight: 800, marginTop: 8 }}>
        {value}
      </div>
      {onClick && (
        <div style={{ fontSize: 12, color: "#667a74", marginTop: 8 }}>
          Click to view details
        </div>
      )}
    </>
  );
  const style: CSSProperties = {
    ...panel,
    borderTop: `4px solid ${color}`,
    textAlign: "left",
    width: "100%",
    minWidth: 0,
    color: "#183a35",
    margin: 0,
  };
  return onClick ? (
    <button type="button" onClick={onClick} style={{ ...style, cursor: "pointer" }}>
      {body}
    </button>
  ) : (
    <section style={style} aria-label={label}>
      {body}
    </section>
  );
}
