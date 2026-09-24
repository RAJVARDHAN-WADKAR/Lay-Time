import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  claimId?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: string;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<string>('email.provider') || 'MOCK';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[EmailService - ${this.provider}] To: ${options.to} | Subject: ${options.subject}`);
    // In MOCK mode, log simulated delivery
    return true;
  }

  async sendClaimReminder(to: string, claimNumber: string, daysOpen: number) {
    return this.sendEmail({
      to,
      subject: `Claim Follow-Up Reminder: ${claimNumber} (${daysOpen} Days Open)`,
      body: `This is an automated operational notice regarding claim ${claimNumber}.`,
    });
  }

  async sendTimebarAlert(to: string, claimNumber: string, daysRemaining: number) {
    return this.sendEmail({
      to,
      subject: `URGENT TIMEBAR NOTICE: ${claimNumber} (${daysRemaining} Days Remaining)`,
      body: `Contractual deadline is approaching for claim ${claimNumber}. Submit documentation immediately.`,
    });
  }

  async sendReviewNotification(to: string, claimNumber: string) {
    return this.sendEmail({
      to,
      subject: `Claim Ready for Supervisor Review: ${claimNumber}`,
      body: `Claim processor has submitted claim ${claimNumber} for final commercial sign-off.`,
    });
  }

  async sendPaymentReminder(to: string, claimNumber: string, amount: number) {
    return this.sendEmail({
      to,
      subject: `Payment Reminder: Agreed Claim ${claimNumber} ($${amount.toLocaleString()})`,
      body: `Statement of claim ${claimNumber} is awaiting settlement remittance.`,
    });
  }
}