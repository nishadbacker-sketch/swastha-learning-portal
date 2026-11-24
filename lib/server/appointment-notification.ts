import "server-only";
import nodemailer from "nodemailer";

const SUPPORT_ADDRESS = "support@swasthalearning.com";
const PORTAL_FOLLOWUP_URL = "https://portal.swasthalearning.com/teacher/appointments";

/**
 * Phase 1: internal email alert only.
 *
 * This is intentionally disabled unless an operator explicitly enables it
 * and supplies server-only SMTP credentials. The notification contains NO
 * child name, guardian name, contact number, history, or medical information.
 * It is not an appointment confirmation email to the applicant.
 */
export async function sendNewAppointmentStaffAlert(): Promise<"disabled" | "sent"> {
  if (process.env.SWASTHA_ENABLE_APPOINTMENT_STAFF_EMAIL !== "true") return "disabled";

  const host = process.env.SWASTHA_SMTP_HOST || "smtp.hostinger.com";
  const username = process.env.SWASTHA_SMTP_USER;
  const password = process.env.SWASTHA_SMTP_PASSWORD;
  const port = Number(process.env.SWASTHA_SMTP_PORT || "465");

  if (!username || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Staff email notification is enabled but SMTP configuration is incomplete.");
  }
  // Never allow environment-controlled recipient redirection.
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: username, pass: password },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  try {
    await transport.sendMail({
      from: { name: "Swastha Learning Clinic", address: SUPPORT_ADDRESS },
      to: SUPPORT_ADDRESS,
      subject: "Swastha Learning Clinic — New appointment enquiry",
      text: "A new appointment enquiry has been recorded. Sign in to the secure clinic follow-up queue to review it: " +
        PORTAL_FOLLOWUP_URL +
        "\n\nThis notification deliberately excludes personal, child and assessment information. " +
        "Please sign in with an authorized clinic staff account.",
      html: '<div style="font-family:Arial,sans-serif;color:#183a35;max-width:540px">' +
        '<h2 style="color:#176b58">Swastha Learning Clinic</h2>' +
        '<p>A new appointment enquiry has been recorded.</p>' +
        '<p><a href="' + PORTAL_FOLLOWUP_URL +
        '" style="color:#176b58">Open secure follow-up queue</a></p>' +
        '<p style="font-size:12px;color:#64748b">Sign in with an authorized clinic staff account. ' +
        'This email contains no child or guardian details.</p></div>',
    });
    return "sent";
  } finally {
    transport.close();
  }
}
