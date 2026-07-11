export const templateWelcomeFreemium = (username?: string) => {
  return `
    <tr>
      <td style="padding: 40px 40px 0;">
        <p style="margin:0 0 6px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                   font-size:12px; font-weight:600; color:#10b981; letter-spacing:1px; text-transform:uppercase;">
          Compte activé
        </p>
        <h1 style="margin:0 0 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                    font-size:26px; font-weight:700; color:#111827; line-height:1.2;">
          Bienvenue sur Lumen Juris${username ? `,<br><span style="color:#716af9;">${username}</span>` : " !"} !
        </h1>
        <p style="margin:0 0 28px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                   font-size:15px; line-height:1.7; color:#374151;">
          Votre compte est prêt. Voici ce qui est inclus dans votre formule
          <strong style="color:#716af9;">Freemium</strong>, activée dès maintenant.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border:1px solid #ede9fe; border-radius:10px; overflow:hidden;">
          <tr>
            <td colspan="2"
                style="background:linear-gradient(135deg,#5b52f0,#9b8fff); padding:14px 20px;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                            font-size:13px; font-weight:700; color:#ffffff; letter-spacing:0.3px;">
                Inclus dans votre formule Freemium
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:14px; color:#374151; border-bottom:1px solid #f3f4f6; background:#fff;">
              <span style="margin-right:10px;">📄</span> Analyse de contrats
            </td>
            <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:13px; font-weight:700; color:#716af9; text-align:right;
                        border-bottom:1px solid #f3f4f6; background:#fff; white-space:nowrap;">
              500 crédits / mois
            </td>
          </tr>

          <tr>
            <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:14px; color:#374151; border-bottom:1px solid #f3f4f6; background:#fafafa;">
              <span style="margin-right:10px;">✍️</span> Signature électronique
            </td>
            <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:13px; font-weight:700; color:#716af9; text-align:right;
                        border-bottom:1px solid #f3f4f6; background:#fafafa; white-space:nowrap;">
              20 crédits / mois
            </td>
          </tr>

          <tr>
            <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:14px; color:#374151; background:#fff;">
              <span style="margin-right:10px;">📝</span> Génération de documents
            </td>
            <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                        font-size:13px; font-weight:700; color:#716af9; text-align:right;
                        background:#fff; white-space:nowrap;">
              30 crédits / mois
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 0 40px 32px;">
        <p style="margin:0 0 24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                   font-size:14px; line-height:1.7; color:#6b7280;">
          Ces crédits sont renouvelés chaque mois. Pour accéder à des capacités supérieures,
          passez à une formule <strong style="color:#111827;">Starter</strong> ou <strong style="color:#111827;">Pro</strong>
          depuis votre tableau de bord.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius:8px; background:linear-gradient(135deg,#5b52f0,#9b8fff);">
              <a href="${process.env.HOST_FRONT ?? "https://app.lumenjuris.com"}/analyzer"
                 style="display:inline-block; padding:14px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                         font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                Analyser mon premier contrat &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};
