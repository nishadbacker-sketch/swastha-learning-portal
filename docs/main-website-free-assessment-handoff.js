/**
 * Main-site booking handoff — install this in the Hostinger main website
 * https://swasthalearning.com/ after /free-assessment supports embedded mode.
 * It reuses the existing #bookingForm instead of asking for details twice.
 *
 * No personal data is written to a URL or browser storage, and no WhatsApp
 * submission is opened. The full assessment is saved after the parent answers.
 */
(() => {
  const PORTAL = "https://portal.swasthalearning.com";
  const form = document.getElementById("bookingForm");
  if (!form || form.dataset.swasthaAssessmentHandoff === "yes") return;
  form.dataset.swasthaAssessmentHandoff = "yes";

  const get = id => document.getElementById(id);
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    // Replace button contents (including the WhatsApp icon).
    submitButton.textContent = "Go to Free Assessment →";
    submitButton.setAttribute("aria-label", "Go to Free Assessment");
  }
  const afterFormNote = document.getElementById("bookingFeedback");
  if (afterFormNote) afterFormNote.textContent =
    "Your details will be used to start the free screening. No WhatsApp message is required.";

  let iframe = null;
  let details = null;
  let dialog = null;

  const dispose = () => {
    if (dialog) dialog.remove();
    iframe = null;
    dialog = null;
    details = null;
  };

  window.addEventListener("message", event => {
    if (event.origin !== PORTAL || !iframe || event.source !== iframe.contentWindow) return;
    if (event.data?.type === "swastha:free-assessment:ready" && details) {
      iframe.contentWindow.postMessage({
        type: "swastha:free-assessment:details", details
      }, PORTAL);
    }
    if (event.data?.type === "swastha:free-assessment:back") dispose();
  });

  // Capture before the original form's WhatsApp submit handler.
  form.addEventListener("submit", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    const selectedTime = form.querySelector('input[name="time"]:checked');
    const diff = !!get("diffContactToggle")?.checked;
    const extraContact = diff
      ? (form.querySelector('input[name="contact"]')?.value || "").trim() : "";
    details = {
      guardian: get("parent")?.value.trim() || "",
      phone: get("phone")?.value.trim() || "",
      contact_differs: diff,
      contact_number: extraContact,
      child: get("child")?.value.trim() || "",
      dob: get("dob")?.value || "",
      grade: get("class")?.value || "",
      preferred_date: get("date")?.value || "",
      preferred_time: selectedTime?.value || "Flexible",
      notes: [get("support")?.value, get("message")?.value]
        .filter(Boolean).join(" — ").slice(0,700),
      consent: !!get("consent")?.checked
    };
    if (!details.guardian || !details.phone || !details.child ||
        !details.dob || !details.grade || !details.consent ||
        (diff && !details.contact_number)) {
      window.alert("Please complete the required parent and child details.");
      return;
    }

    if (dialog) dispose();
    dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Free Child Development Assessment");
    dialog.style.cssText =
      "position:fixed;inset:0;z-index:2147483640;background:#0b332cee;" +
      "padding:12px;display:flex;flex-direction:column;gap:8px;";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "← Back to Swastha website";
    close.style.cssText =
      "align-self:flex-end;padding:10px 16px;background:#fff;color:#176b58;" +
      "border:0;border-radius:9px;font-weight:700;cursor:pointer;";
    close.addEventListener("click", dispose);
    iframe = document.createElement("iframe");
    iframe.title = "Swastha Free Child Development Assessment";
    iframe.src = PORTAL + "/free-assessment";
    iframe.style.cssText =
      "display:block;flex:1;min-height:0;width:100%;border:0;border-radius:12px;background:white;";
    iframe.referrerPolicy = "no-referrer";
    dialog.append(close, iframe);
    document.body.appendChild(dialog);
  }, true);
})();
