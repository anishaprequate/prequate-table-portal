// Outbound email, sent as anisha@prequate.one via Google Workspace SMTP
// (an app password on that account, not OAuth — a different mechanism
// from the Calendar integration's OAuth flow in google-oauth.ts).
//
// Real send whenever SMTP_USER and SMTP_APP_PASSWORD are both set. With
// neither set, this falls back to logging what would have been sent
// instead of throwing, so the app still runs with zero setup — same
// convention as google-calendar.ts's mock fallback.
import nodemailer from "nodemailer";

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

export interface SendEmailResult {
  messageId: string;
}

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) return null;

  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return cachedTransport;
}

export async function sendEmail({ to, subject, text }: SendEmailParams): Promise<SendEmailResult> {
  const transport = getTransport();

  if (!transport) {
    console.log(`[mock-email] to ${to} — ${subject}\n${text}`);
    return { messageId: `mock-email-${Date.now()}` };
  }

  const info = await transport.sendMail({
    from: `"The Prequate Table" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
  return { messageId: info.messageId };
}
