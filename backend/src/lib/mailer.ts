import nodemailer, { type Transporter } from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export class MailerNotConfiguredError extends Error {
  constructor() {
    super('SMTP 환경변수가 설정되지 않았습니다. SMTP_HOST / SMTP_USER / SMTP_PASS 를 확인하세요.');
    this.name = 'MailerNotConfiguredError';
  }
}

export function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
  const from = process.env.SMTP_FROM?.trim() || user;

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: Transporter | null = null;
let cachedKey: string | null = null;

function getTransporter(cfg: SmtpConfig): Transporter {
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}`;
  if (cachedTransporter && cachedKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  cachedKey = key;
  return cachedTransporter;
}

export interface MailAttachment {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
}

export interface SendMailParams {
  to: string;
  cc?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}

export interface SendMailResult {
  messageId: string;
}

export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const cfg = readSmtpConfig();
  if (!cfg) throw new MailerNotConfiguredError();

  // nodemailer Attachment.content 는 Uint8Array 를 받지 않으므로 Buffer 로 정규화.
  const attachments = params.attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    contentType: a.contentType,
  }));

  const transporter = getTransporter(cfg);
  const info = await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    cc: params.cc || undefined,
    subject: params.subject,
    text: params.text,
    html: params.html,
    attachments,
  });
  return { messageId: info.messageId };
}

export function isMailerConfigured(): boolean {
  return readSmtpConfig() !== null;
}
