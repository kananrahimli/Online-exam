import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

@Injectable()
export class EmailService {
  private defaultTransporter: nodemailer.Transporter | null = null;

  constructor() {
    // Create default transporter if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Trim whitespace (common issue with .env files)
      const smtpUser = process.env.SMTP_USER.trim();
      const smtpPass = process.env.SMTP_PASS.trim();

      this.defaultTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT?.trim() || '587'),
        secure: process.env.SMTP_SECURE?.trim() === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  private getEmailProviderConfig(email: string): SmtpConfig | null {
    const domain = email.toLowerCase().split('@')[1];

    // Trim environment variables
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();

    // Gmail
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      };
    }

    // Outlook/Hotmail
    if (
      domain === 'outlook.com' ||
      domain === 'hotmail.com' ||
      domain === 'live.com' ||
      domain === 'msn.com'
    ) {
      return {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      };
    }

    // Yahoo
    if (
      domain === 'yahoo.com' ||
      domain === 'yahoo.co.uk' ||
      domain === 'ymail.com'
    ) {
      return {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      };
    }

    // Yandex
    if (domain === 'yandex.com' || domain === 'yandex.ru') {
      return {
        host: 'smtp.yandex.com',
        port: 465,
        secure: true,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      };
    }

    // Mail.ru
    if (domain === 'mail.ru' || domain === 'inbox.ru') {
      return {
        host: 'smtp.mail.ru',
        port: 465,
        secure: true,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      };
    }

    // Custom SMTP (use default if configured)
    if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST.trim(),
        port: parseInt(process.env.SMTP_PORT?.trim() || '587'),
        secure: process.env.SMTP_SECURE?.trim() === 'true',
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      };
    }

    return null;
  }

  private createTransporter(config: SmtpConfig): nodemailer.Transporter {
    return nodemailer.createTransport(config);
  }

  async sendVerificationCode(email: string, code: string) {
    // Debug: Log environment variables (without revealing password)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 SMTP Configuration Check:');
      console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'not set');
      console.log('  SMTP_PORT:', process.env.SMTP_PORT || 'not set');
      console.log('  SMTP_SECURE:', process.env.SMTP_SECURE || 'not set');
      console.log(
        '  SMTP_USER:',
        process.env.SMTP_USER
          ? `${process.env.SMTP_USER.substring(0, 3)}***`
          : 'not set',
      );
      console.log(
        '  SMTP_PASS:',
        process.env.SMTP_PASS ? '***set***' : 'not set',
      );
      console.log('  SMTP_FROM:', process.env.SMTP_FROM || 'not set');
    }

    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        'SMTP konfiqurasiyası tapılmadı. Zəhmət olmasa .env faylında SMTP_USER və SMTP_PASS dəyişənlərini təyin edin. EMAIL_SETUP.md faylına baxın.',
      );
    }

    // Trim whitespace from credentials (common issue)
    const smtpUser = process.env.SMTP_USER.trim();
    const smtpPass = process.env.SMTP_PASS.trim();

    // Get provider-specific config or use default
    const config = this.getEmailProviderConfig(email);
    const emailDomain = email.toLowerCase().split('@')[1];
    let transporter: nodemailer.Transporter;

    if (config && config.auth) {
      // Update config with trimmed values
      config.auth.user = smtpUser;
      config.auth.pass = smtpPass;
      transporter = this.createTransporter(config);

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Using provider-specific config:', {
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: `${smtpUser.substring(0, 3)}***`,
        });
      }
    } else if (this.defaultTransporter) {
      // Recreate default transporter with trimmed values
      const defaultConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };
      transporter = this.createTransporter(defaultConfig);

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Using default SMTP config:', {
          host: defaultConfig.host,
          port: defaultConfig.port,
          secure: defaultConfig.secure,
          user: `${smtpUser.substring(0, 3)}***`,
        });
      }
    } else {
      throw new Error(
        'SMTP konfiqurasiyası tapılmadı. Zəhmət olmasa .env faylında SMTP dəyişənlərini təyin edin.',
      );
    }

    const mailOptions = {
      from:
        process.env.SMTP_FROM?.trim() || smtpUser || 'noreply@onlineexam.az',
      to: email,
      subject: 'Şifrə Bərpası - Verifikasiya Kodu',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              border-radius: 10px;
              color: white;
            }
            .code-box {
              background: white;
              color: #333;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Şifrə Bərpası</h1>
            <p>Salam,</p>
            <p>Şifrənizi bərpa etmək üçün aşağıdakı verifikasiya kodundan istifadə edin:</p>
            <div class="code-box">
              ${code}
            </div>
            <p><strong>Diqqət:</strong> Bu kodun müddəti 2 dəqiqədir.</p>
            <p>Əgər siz bu sorğunu göndərməmisinizsə, bu email-i nəzərə almayın.</p>
          </div>
          <div class="footer">
            <p>Bu email avtomatik olaraq göndərilmişdir. Zəhmət olmasa cavab verməyin.</p>
            <p>© ${new Date().getFullYear()} Online İmtahan Platforması</p>
          </div>
        </body>
        </html>
      `,
      text: `
Şifrə Bərpası - Verifikasiya Kodu

Salam,

Şifrənizi bərpa etmək üçün aşağıdakı verifikasiya kodundan istifadə edin:

${code}

Diqqət: Bu kodun müddəti 2 dəqiqədir.

Əgər siz bu sorğunu göndərməmisinizsə, bu email-i nəzərə almayın.

© ${new Date().getFullYear()} Online İmtahan Platforması
      `,
    };

    try {
      // Verify connection before sending (skip if auth not configured)
      if (config?.auth || this.defaultTransporter) {
        try {
          await transporter.verify();
        } catch (verifyError) {
          console.warn(
            '⚠️  SMTP verification failed, but attempting to send anyway',
          );
        }
      }

      const info = await transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Email sent successfully to ${email}:`, info.messageId);
      }

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`❌ Error sending email to ${email}:`, error.message);
        console.error('Error details:', {
          code: error.code,
          responseCode: error.responseCode,
          command: error.command,
        });
      }

      // If authentication failed, provide helpful error message based on provider
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        let providerMessage = '';

        if (emailDomain === 'gmail.com' || emailDomain === 'googlemail.com') {
          providerMessage =
            'Gmail üçün App Password (Tətbiq Şifrəsi) istifadə etməlisiniz. Adi şifrə işləməyəcək. EMAIL_SETUP.md faylına baxın.';
        } else if (
          emailDomain === 'outlook.com' ||
          emailDomain === 'hotmail.com' ||
          emailDomain === 'live.com' ||
          emailDomain === 'msn.com'
        ) {
          providerMessage =
            'Outlook/Hotmail üçün App Password (Tətbiq Şifrəsi) lazımdır. Microsoft Account → Security → App passwords.';
        } else if (
          emailDomain === 'yahoo.com' ||
          emailDomain === 'yahoo.co.uk' ||
          emailDomain === 'ymail.com'
        ) {
          providerMessage =
            'Yahoo üçün App Password (Tətbiq Şifrəsi) lazımdır. Account Security → Generate app password.';
        } else {
          providerMessage =
            'Email provider üçün düzgün SMTP autentifikasiya bilgiləri tələb olunur.';
        }

        throw new Error(
          `Email göndərilməsi üçün SMTP autentifikasiya xətası. ${providerMessage} Zəhmət olmasa .env faylında SMTP_USER və SMTP_PASS düzgün təyin olunduğunu yoxlayın.`,
        );
      }

      // Handle other common errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        throw new Error(
          `SMTP server-ə qoşula bilmədi. Zəhmət olmasa SMTP_HOST və SMTP_PORT düzgün təyin olunduğunu yoxlayın. Xəta: ${error.message}`,
        );
      }

      throw new Error(`Email göndərilərkən xəta baş verdi: ${error.message}`);
    }
  }
}
