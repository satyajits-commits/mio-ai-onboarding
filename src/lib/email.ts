import { prisma } from "@/lib/db";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Send an email. When no SMTP provider is configured (dev/demo), the message
 * is recorded in the EmailOutbox table and logged, so credential delivery is
 * observable without a real mail server. Swap in nodemailer/SES/Resend here.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  // Production hook: if SMTP/API env is present, send for real here.
  // For now we always record to the outbox.
  await prisma.emailOutbox.create({ data: msg });
  // eslint-disable-next-line no-console
  console.log(`[email] -> ${msg.to}: ${msg.subject}`);
}

export function credentialsEmail(opts: {
  institutionName: string;
  url: string;
  email: string;
  password: string;
}): EmailMessage {
  return {
    to: opts.email,
    subject: `Your MIO AI Voice Agent onboarding link`,
    body: [
      `Hi,`,
      ``,
      `Your MIO AI Voice Agent onboarding for ${opts.institutionName} is ready.`,
      ``,
      `Onboarding link: ${opts.url}`,
      `Email: ${opts.email}`,
      `Password: ${opts.password}`,
      ``,
      `Open the link and log in with the credentials above to build your AI Voice Agent.`,
      ``,
      `— The MIO AI Team`,
    ].join("\n"),
  };
}
