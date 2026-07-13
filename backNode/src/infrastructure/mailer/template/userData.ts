export const templateExportData = (username?: string) => {
  return `
        <tr>
            <td style="padding:30px; font-family: Arial, sans-serif; color:#1f2937;">

                <h2 style="margin-top:0; margin-bottom:10px;">Bonjour <strong>${username || "Abonné"}</strong>.</h2>

                <p style="font-size:14px; line-height:1.6;">
                    Conformément à votre demande, nous avons préparé l'export complet des données associées à votre compte Lumen Juris.<br/>
                </p>

                <p style="font-size:14px; line-height:1.6; margin-top:20px;">
                    Le fichier est au format <strong>.json</strong>. C'est un format standardisé et structuré qui vous permet de lire vos données de façon transparente ou de les transférer si nécessaire.
                </p>

                <p style="font-size:13px; color:#6b7280; line-height:1.5; margin-top:30px; padding: 15px; background-color: #f9fafb; border-left: 4px solid #716af9; border-radius: 4px;">
                    <strong>Sécurité de vos données :</strong> Ce fichier contient des informations personnelles et confidentielles sur vos activités. Nous vous conseillons de le conserver dans un endroit sécurisé et de ne pas le partager.
                </p>

                <p style="font-size:13px; color:#6b7280; margin-top:30px;">
                    Si vous n'êtes pas à l'origine de cette demande, cela signifie qu'une personne a demandé l'export depuis votre espace client. Si vous suspectez une activité anormale, nous vous conseillons de modifier votre mot de passe sans tarder.
                </p>

                <p style="font-size:13px; color:#6b7280; margin-top:20px;">
                    L'équipe Lumen Juris
                </p>

            </td>
        </tr>
    `;
};
