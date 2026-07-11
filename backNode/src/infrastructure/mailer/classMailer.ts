import nodemailer from "nodemailer";
import { templateVerifyAccount } from "./template/verifyAccount.js";
import { templateResetPassword } from "./template/resetPassword.js";
import { templateTwoFactor } from "./template/twoFactor.js";
import { templateInvoiceEmail } from "./template/invoiceEmail.js";
import { templateWelcomeFreemium } from "./template/welcomeFreemium.js";
import { generateInvoicePDF, type InvoiceData } from "../pdf/invoicePDF.js";


import { logger } from "../../logger/logger.js";


const transporter = nodemailer.createTransport({
  host: "mail.lumenjuris.com",
  port: 465,
  secure: true,

  pool: true,
  maxConnections: 5,
  maxMessages: Infinity,

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,

  auth: {
    user: process.env.MAILER_USER_O2S,
    pass: process.env.MAILER_PASS_O2S,
  },
});

export class Mailer {
  private email: string;

  constructor(email: string) {
    if (!process.env.MAILER_USER_O2S || !process.env.MAILER_PASS_O2S) {
      throw new Error("Configuration SMTP manquante");
    }

    this.email = email;
  }

  private errorCatching(err: unknown) {
    console.error(
      `Une erreur est survenu lors d'un envoie d'un email' error : ${err}`,
    );
    logger.error("Une erreur est survenu lors d'un envoie d'un email", err)
    return {
      success: false,
      message:
        "Erreur avec le serveur est survenue lors de l'envoie d'un email.",
      error: err,
    };
  }

  private createOption(
    html: string,
    subject: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>,
  ) {
    const textBrutFallback = html.replace(/<[^>]*>/g, "");
    return {
      from: '"Lumen Juris" <no-reply@lumenjuris.com>',
      to: this.email,
      subject,
      text: textBrutFallback,
      html,
      ...(attachments?.length ? { attachments } : {}),
    };
  }

  private createHtmlHeader() {
    return `
        <tr>
            <td style="background: linear-gradient(135deg, #c8deff 0%, #9bc0f6 100%); padding: 32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0">

                
                    <tr>
                        <td>
                            <span style="color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                                         font-size:20px; font-weight:700; letter-spacing:-0.3px;">
                                
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="22 20 200 36" width="166.66666666666666" height="30" aria-label="LumenJuris" role="img">
                                <circle cx="34" cy="40" fill="none" r="9" stroke="#0D6EFD" stroke-width="2"></circle>
                                <circle cx="34" cy="40" fill="#0D6EFD" r="4"></circle>
                                Lumen Juris
                                </text>
                                </svg>
                                         Lumen Juris
                            </span>
                        </td>
                        <td style="text-align:right;">
                            <span style="color:rgba(255,255,255,0.7); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                                         font-size:11px; font-weight:500; letter-spacing:1px; text-transform:uppercase;">
                                Intelligence Juridique
                            </span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;
  }

  private createHtmlFooter() {
    const year = new Date().getFullYear();
    return `
        <tr>
            <td style="padding: 32px 40px 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:14px; color:#374151; border-top: 1px solid #f3f4f6;">
                Cordialement,<br>
                <strong style="color:#111827;">L'équipe Lumen Juris</strong>
            </td>
        </tr>

        <tr>
            <td style="background-color:#fafafa; padding: 24px 40px; border-top: 1px solid #f0f0f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="text-align:center; padding-bottom:12px;">
                            <a href="https://lumenjuris.com"
                               style="color:#716af9; text-decoration:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                                      font-size:13px; font-weight:600;">
                                lumenjuris.com
                            </a>
                            &nbsp;&nbsp;·&nbsp;&nbsp;
                            <a href="mailto:contact@lumenjuris.com"
                               style="color:#6b7280; text-decoration:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                                      font-size:13px;">
                                contact@lumenjuris.com
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="text-align:center;">
                            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                                         font-size:11px; color:#9ca3af;">
                                &copy; ${year} Lumen Juris — Tous droits réservés.
                            </span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;
  }

  private createHtmlFullContent(htmlContent: string) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0; padding:0; background-color:#f0efff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0efff; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; width:100%; background-color:#ffffff;
                      border-radius:12px; overflow:hidden;
                      box-shadow:0 4px 24px rgba(113,106,249,0.10), 0 1px 4px rgba(0,0,0,0.06);">
          ${this.createHtmlHeader()}
          ${htmlContent}
          ${this.createHtmlFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }


  /**
   * Initialise le transporter dés l'ouverture du serveur.
   */
  async initTransporter() {
    try {
      await transporter.verify()
      console.log("Transporteur envoie email SMTP prêt.")
      logger.info("Verification du transporter SMTP")
    } catch (err) {
      console.error("Erreur lors de la verification du transporteur")
      logger.error("Erreur lors de la verification du transporteur", err)
      throw err
    }
  }

  async sendVerifyAccount(verificationLink: string, username: string) {
    try {
      const html = this.createHtmlFullContent(
        templateVerifyAccount(verificationLink, username),
      );
      const mailOptions = this.createOption(
        html,
        "Activez votre compte Lumen Juris",
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoie d'un email, id indisponible de retour indisponible.\n ${sending}`,
        );
      }
      return {
        success: !!sending.messageId,
        message: sending.messageId
          ? `Un email a été envoyé à votre adresse ${this.email}, veuillez consulter votre boîte de réception pour valider votre inscription.`
          : "Une erreur est survenue avec le serveur nous n'avons pas pu envoyer votre email.",
      };
    } catch (err) {
      return this.errorCatching(err);
    }
  }

  async sendResetPassword(resetLink: string, username?: string) {
    try {
      const html = this.createHtmlFullContent(
        templateResetPassword(resetLink, username),
      );
      const mailOptions = this.createOption(
        html,
        "Réinitialisation de votre mot de passe Lumen Juris",
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoie d'un email, id indisponible de retour indisponible.\n ${sending}`,
        );
      }
      return {
        success: !!sending.messageId,
        message: sending.messageId
          ? `Un email a été envoyé à votre adresse ${this.email}, veuillez consulter votre boîte de réception pour réinitialiser votre mot de passe.`
          : "Une erreur est survenue avec le serveur nous n'avons pas pu envoyer votre email.",
      };
    } catch (err) {
      return this.errorCatching(err);
    }
  }

  async sendTwoFactor(code: string, username?: string) {
    try {
      const html = this.createHtmlFullContent(
        templateTwoFactor(code, username),
      );
      const mailOptions = this.createOption(
        html,
        "Votre code de vérification Lumen Juris",
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoie du code 2FA, messageId indisponible.\n ${sending}`,
        );
      }
      return {
        success: true,
        message: `Un code de vérification a été envoyé à ${this.email}. Il est valide 15 minutes.`,
      };
    } catch (err) {
      return this.errorCatching(err);
    }
  }

  async sendWelcomeFreemium(username?: string) {
    try {
      const html = this.createHtmlFullContent(templateWelcomeFreemium(username));
      const mailOptions = this.createOption(
        html,
        "Bienvenue sur Lumen Juris — votre formule Freemium est activée",
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoi du mail de bienvenue, messageId indisponible.\n ${sending}`,
        );
      }
      return { success: true };
    } catch (err) {
      return this.errorCatching(err);
    }
  }

  async sendInvoice(invoiceData: InvoiceData, username?: string) {
    try {
      const pdfBuffer = await generateInvoicePDF(invoiceData);
      const html = this.createHtmlFullContent(
        templateInvoiceEmail(invoiceData, username),
      );
      const mailOptions = this.createOption(
        html,
        `Votre facture Lumen Juris — ${invoiceData.invoiceNumber}`,
        [
          {
            filename: `facture-${invoiceData.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoi de la facture, messageId indisponible.\n ${sending}`,
        );
      }
      return {
        success: true,
        message: `La facture ${invoiceData.invoiceNumber} a été envoyée à ${this.email}.`,
      };
    } catch (err) {
      return this.errorCatching(err);
    }
  }
}
