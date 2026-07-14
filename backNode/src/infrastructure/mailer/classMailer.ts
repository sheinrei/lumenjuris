import nodemailer from "nodemailer";
import { templateVerifyAccount } from "./template/verifyAccount.js";
import { templateResetPassword } from "./template/resetPassword.js";
import { templateTwoFactor } from "./template/twoFactor.js";
import { templateInvoiceEmail } from "./template/invoiceEmail.js";
import { templateWelcomeFreemium } from "./template/welcomeFreemium.js";
import { templateSignatureInvite } from "./template/signatureInvite.js";
import { templateSignatureCompletion } from "./template/signatureCompletion.js";
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
    cc?: string,
  ) {
    const textBrutFallback = html.replace(/<[^>]*>/g, "");
    return {
      from: '"Lumen Juris" <no-reply@lumenjuris.com>',
      to: this.email,
      ...(cc ? { cc } : {}),
      subject,
      text: textBrutFallback,
      html,
      ...(attachments?.length ? { attachments } : {}),
    };
  }

  private createHtmlHeader() {
    return `    
      <tr>
        <td style="background-color:#0B1F3A; padding:28px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="34" style="width:34px; padding-right:10px;" valign="middle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26" aria-label="LumenJuris" role="img" style="display:block;">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="#5B9DF5" stroke-width="2"></circle>
                  <circle cx="16" cy="16" r="4.5" fill="#5B9DF5"></circle>
                </svg>
              </td>
              <td valign="middle" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; font-size:20px; letter-spacing:-0.3px; white-space:nowrap;">
                <span style="font-weight:700; color:#FFFFFF;">Lumen</span><span style="font-weight:400; color:#9CB8E8;"> Juris</span>
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
                      font-size:14px; line-height:1.6; color:#374151;">
              Cordialement,<br>
              <strong style="color:#111827;">L'équipe Lumen Juris</strong>
          </td>
      </tr>

      <tr>
          <td style="background-color:#f7f9fc; padding: 24px 40px; border-top: 2px solid #e8edf5">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                      <td style="text-align:center; padding-bottom:12px;">
                          <a href="https://lumenjuris.com"
                             style="color:#0D6EFD; text-decoration:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                                    font-size:13px; font-weight:600;">
                              lumenjuris.com
                          </a>
                          <span style="color:#c7ced9; font-size:13px; padding:0 10px;">&middot;</span>
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

  /**
   * Invitation à signer un document (envoyée au cocontractant). `cc` permet de
   * mettre l'émetteur en copie.
   */
  async sendSignatureInvite(opts: {
    counterpartyName: string;
    documentName: string;
    signingLink: string;
    cc?: string;
  }) {
    try {
      const html = this.createHtmlFullContent(
        templateSignatureInvite(opts.counterpartyName, opts.documentName, opts.signingLink),
      );
      const mailOptions = this.createOption(
        html,
        `Document à signer — ${opts.documentName}`,
        undefined,
        opts.cc,
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoi de l'invitation à signer, messageId indisponible.\n ${sending}`,
        );
      }
      return {
        success: true,
        message: `Une invitation à signer a été envoyée à ${this.email}.`,
      };
    } catch (err) {
      return this.errorCatching(err);
    }
  }

  /**
   * Confirmation envoyée à une partie une fois le document signé par les deux
   * parties. Le PDF signé peut être joint (`pdf`).
   */
  async sendSignatureCompletion(opts: {
    recipientName: string;
    documentName: string;
    selfLabel: string;
    counterpartyName: string;
    signedDate?: Date;
    pdf?: { filename: string; content: Buffer };
  }) {
    try {
      const dateStr = (opts.signedDate ?? new Date()).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const html = this.createHtmlFullContent(
        templateSignatureCompletion(
          opts.recipientName,
          opts.documentName,
          opts.selfLabel,
          opts.counterpartyName,
          dateStr,
          !!opts.pdf,
        ),
      );
      const attachments = opts.pdf
        ? [{ filename: opts.pdf.filename, content: opts.pdf.content, contentType: "application/pdf" }]
        : undefined;
      const mailOptions = this.createOption(
        html,
        `Document signé — ${opts.documentName}`,
        attachments,
      );
      const sending = await transporter.sendMail(mailOptions);

      if (!sending.messageId) {
        throw new Error(
          `Echec lors de l'envoi de la confirmation de signature, messageId indisponible.\n ${sending}`,
        );
      }
      return {
        success: true,
        message: `La confirmation de signature a été envoyée à ${this.email}.`,
      };
    } catch (err) {
      return this.errorCatching(err);
    }
  }
}
