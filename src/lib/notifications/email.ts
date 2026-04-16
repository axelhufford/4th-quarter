import { Resend } from "resend";

// Placeholder needed at build time (Vercel builds without env vars).
// At runtime, we check for the real key before sending.
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

interface EmailNotification {
  title: string;
  body: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmailNotification(
  to: string,
  notification: EmailNotification
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: "4th Quarter <onboarding@resend.dev>",
      to,
      subject: notification.title,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; background: #111; color: #fff; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">🏀</span>
          </div>
          <h1 style="color: #f97316; font-size: 24px; text-align: center; margin: 0 0 8px;">
            ${escapeHtml(notification.title)}
          </h1>
          <p style="color: #d4d4d8; font-size: 18px; text-align: center; margin: 0 0 32px;">
            ${escapeHtml(notification.body)}
          </p>
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
          <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
            4th Quarter — Never miss the clutch moments
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false };
  }
}
