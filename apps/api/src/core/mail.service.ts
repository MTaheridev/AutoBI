import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { appPublicUrl, loadEnv } from '@autobi/config';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly log = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from = 'AutoBI <noreply@localhost>';
  private mode: 'smtp' | 'console' = 'console';

  onModuleInit() {
    const env = loadEnv();
    this.from = env.SMTP_FROM ?? this.from;
    if (env.SMTP_URL) {
      this.transporter = nodemailer.createTransport(env.SMTP_URL);
      this.mode = 'smtp';
      return;
    }
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP_URL is required in production');
    }
    this.mode = 'console';
    this.log.warn('mail_console_transport — set SMTP_URL to send real email');
  }

  async send(input: { to: string; subject: string; text: string; html?: string }) {
    if (this.mode === 'console' || !this.transporter) {
      this.log.log(`mail_console to=${input.to} subject=${input.subject}\n${input.text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text,
    });
  }

  async sendVerifyEmail(to: string, token: string) {
    const base = appPublicUrl();
    const link = `${base.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Verify your AutoBI email',
      text: `Verify your email: ${link}\n\nOr paste this token: ${token}`,
      html: `<p>Verify your email:</p><p><a href="${link}">${link}</a></p><p>Token: <code>${token}</code></p>`,
    });
  }

  async sendInviteEmail(to: string, token: string, workspaceName: string) {
    const base = appPublicUrl();
    const link = `${base.replace(/\/$/, '')}/register?invite=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: `Join ${workspaceName} on AutoBI`,
      text: `You were invited to ${workspaceName}. Accept: ${link}`,
      html: `<p>You were invited to <strong>${workspaceName}</strong>.</p><p><a href="${link}">Accept invite</a></p>`,
    });
  }
}
