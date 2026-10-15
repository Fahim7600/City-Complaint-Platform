import { config } from "../../config/env";
import { AppError } from "../auth/auth.service";

export interface SendEmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: SendEmailRecipient;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email via Brevo's HTTPS API (avoids Render SMTP port blocking).
 * If BREVO_API_KEY is not set in non-production environments, logs to console instead.
 */
export const sendEmail = async (
  options: SendEmailOptions,
): Promise<{ messageId?: string }> => {
  const { to, subject, html, text } = options;

  if (!config.BREVO_API_KEY) {
    if (config.NODE_ENV === "production") {
      console.error(
        "[Mail Error] BREVO_API_KEY is not configured in production",
      );
      throw new AppError("Email service unavailable", 502);
    }

    console.log("------------------------------------------------------------");
    console.log(
      "[Mail Dev Mode] No BREVO_API_KEY set. Logging email to console:",
    );
    console.log(`To:      ${to.name ? `${to.name} <${to.email}>` : to.email}`);
    console.log(`Subject: ${subject}`);
    console.log("--- Plain Text Body ---");
    console.log(text);
    console.log("------------------------------------------------------------");
    return { messageId: "dev-simulated-message-id" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const sender = {
      email: config.MAIL_FROM_EMAIL || "noreply@citycomplaints.com",
      name: config.MAIL_FROM_NAME || "CityFix",
    };

    const payload = {
      sender,
      to: [{ email: to.email, name: to.name || to.email }],
      subject,
      htmlContent: html,
      textContent: text,
    };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        "[Brevo Error] Non-2xx response from Brevo API:",
        res.status,
        errText,
      );
      throw new AppError("Email service unavailable", 502);
    }

    const data = (await res.json().catch(() => ({}))) as {
      messageId?: string;
    };
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof AppError) {
      throw err;
    }
    console.error(
      "[Mail Error] Failed to send email via Brevo HTTPS API:",
      err,
    );
    throw new AppError("Email service unavailable", 502);
  }
};
