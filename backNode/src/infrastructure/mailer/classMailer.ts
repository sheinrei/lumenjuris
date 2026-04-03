import nodemailer from "nodemailer";
import { templateVerifyAccount } from "./template/verifyAccount";
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS
    }
});


export class Mailer {
    private email: string;


    constructor(email: string) {
        if (!process.env.MAILER_USER || !process.env.MAILER_PASS) {
            throw new Error("Configuration SMTP manquante");
        }

        this.email = email;
    }

    private errorCatching(err: unknown) {
        console.error(`Une erreur est survenu lors d'un envoie d'un email' error : ${err}`)
        return {
            success: false,
            message: "Erreur avec le serveur est survenue lors de l'envoie d'un email.",
            error: err
        }
    }


    private createOption(html: string, subject: string) {
        const textBrutFallback = html.replace(/<[^>]*>/g, "")
        const mailOptions = {
            from: '"Lumen Juris" <no-reply@lumenjuris.com>',
            to: this.email,
            subject, //Le titre qui sera affiché avant l'ouverture de l'email
            text: textBrutFallback, // fallback en cas de non gestion du texte html
            html,
        };
        return mailOptions
    }


    private createHtmlHeader() {
        return `
            <tr>
                <td style="background-color:#716af9; padding:20px; text-align:center; color:#ffffff; font-size:24px; font-weight:bold;">
                    Lumen Juris
                </td>
            </tr>
    `
    }

    private createHtmlFooter() {
        const date = new Date()
        const year = date.getFullYear()
        return `
        <tr>
            <td style="padding: 20px 30px; font-family: Arial, sans-serif; font-size:14px; color:#1f2937;">
                Cordialement,<br>
                <strong>L'équipe Lumen Juris</strong>
            </td>
        </tr>
        <tr>
            <td 
            style="background-color:#f4f4f4; padding:20px; text-align:center;
             font-family: Arial, sans-serif; font-size:12px; color:#777777;">
                &copy; ${year} Lumen Juris. Tous droits réservés.<br>
            </td>
        </tr>`
    }


    private createHtmlFullContent(htmlContent: string) {
        return `<body style="margin:0;padding:0; overflow:hidden;">
        <table width="50%" cellpadding="0" cellspacing="0" style="border:1px solid #b3b7be;border-radius:8px; overflow:hidden;">
        ${this.createHtmlHeader()}
        ${htmlContent}
        ${this.createHtmlFooter()}
        </table>
        </body>`
    }




    async sendVerifyAccount(verificationLink: string, username: string) {
        try {

            const html = this.createHtmlFullContent(templateVerifyAccount(verificationLink, username))
            const mailOptions = this.createOption(html, "Activez votre compte Lumen Juris")
            const sending = await transporter.sendMail(mailOptions);

            if (!sending.messageId) {
                throw new Error(`Echec lors de l'envoie d'un email, id indisponible de retour indisponible.\n ${sending}`)
            }
            return {
                success: true,
                message: `L'email de rappel de rendez-vous a été envoyé au destinataire ${this.email} avec succès.`
            }
        } catch (err) {
            return this.errorCatching(err)
        }
    }








}