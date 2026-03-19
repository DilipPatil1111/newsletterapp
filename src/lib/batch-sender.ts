import { Resend } from "resend";
import { db } from "@/lib/db";
import { sendRecipients } from "@/server/db/schema";

interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
}

interface RecipientResult {
  contactId: string;
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  resend: Resend,
  params: SendEmailParams,
  retries: number = MAX_RETRIES
): Promise<{ id?: string; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        headers: params.headers,
        replyTo: params.replyTo,
      });

      if (result.error) {
        if (attempt < retries) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        return { error: result.error.message };
      }

      return { id: result.data?.id };
    } catch (err) {
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      return { error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
  return { error: "Max retries exceeded" };
}

export async function batchSendEmails(
  resendApiKey: string,
  sendJobId: string,
  emails: Array<{
    contactId: string;
    email: string;
    params: SendEmailParams;
  }>
): Promise<{ sentCount: number; failedCount: number; results: RecipientResult[] }> {
  const resend = new Resend(resendApiKey);
  const results: RecipientResult[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const result = await sendWithRetry(resend, item.params);

        if (result.id) {
          await db.insert(sendRecipients).values({
            sendJobId,
            contactId: item.contactId,
            email: item.email,
            status: "sent",
            providerMessageId: result.id,
            sentAt: new Date(),
          });
          sentCount++;
          return { contactId: item.contactId, email: item.email, success: true, messageId: result.id };
        } else {
          await db.insert(sendRecipients).values({
            sendJobId,
            contactId: item.contactId,
            email: item.email,
            status: "failed",
            errorMessage: result.error,
          });
          failedCount++;
          return { contactId: item.contactId, email: item.email, success: false, error: result.error };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    if (i + BATCH_SIZE < emails.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { sentCount, failedCount, results };
}
