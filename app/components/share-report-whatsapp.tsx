"use client";

type ShareReportProps = {
  reportPath: string;
  compact?: boolean;
  label?: string;
};

export default function ShareReportWhatsApp({
  reportPath,
  compact = false,
  label = "Share via WhatsApp",
}: ShareReportProps) {
  function share() {
    // A link only: never add student names, answers, scores or access tokens
    // to the WhatsApp message. The report itself enforces login and RLS.
    const url = new URL(reportPath, window.location.origin);
    const message = [
      "Swastha Learning Clinic",
      "An approved assessment report is available in the secure learning portal.",
      "Please sign in with your authorised account to view it:",
      url.toString(),
    ].join("\n");
    window.open(
      "https://api.whatsapp.com/send?text=" + encodeURIComponent(message),
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <button
      type="button"
      className="no-print report-actions-whatsapp"
      onClick={share}
      aria-label="Share secure assessment report link via WhatsApp"
      title="Shares a private portal link, not a PDF file. Recipient must have access."
      style={{
        background: "#168a58",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: compact ? "8px 11px" : "10px 14px",
        fontWeight: 700,
        cursor: "pointer",
        fontSize: compact ? 12 : 13,
      }}
    >
      {label}
    </button>
  );
}
