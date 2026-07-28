import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  text: string;
};

export function appUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ||
    "https://skala-skct.vercel.app";
  return new URL(path, base).toString();
}

export async function sendMail({ to, subject, text }: MailOptions) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? user;

  if (!host || !user || !pass || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[mail:dev] SMTP is not configured; email delivery was skipped."
      );
      return;
    }
    throw new Error("메일 발송 설정이 필요합니다.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, text });
}
