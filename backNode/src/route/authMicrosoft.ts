import express from "express"
import { ConfidentialClientApplication } from "@azure/msal-node";
import { randomBytes } from "crypto";


//Configuration du client microsoft, init au démarage pour ne pas dupliquer la création à chaque appel
const microsoftConfig = {
    auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        autorithy: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET
    }
}
const microsoftClient = new ConfidentialClientApplication(microsoftConfig);
const microsoftScopes = [
    "openid",
    "profile",
    "email"
]


export const microsoftRouter = express.Router()

//route d'appel par le front qui va configurer le client microsoft puis rediriger vers leurs pages pour l'auth
microsoftRouter.get("/auth/microsoft", async (req, res) => {
    try {

        const state = crypto.randomBytes(32).toString("hex");
        req.session.microsoftOAuthState = state;

        const authCodeUrl = await microsoftClient.getAuthCodeUrl({
            scopes: microsoftScopes,
            redirectUri: process.env.MICROSOFT_REDIRECT_URI_LOCAL!,

            state: crypto.randomUUID(),

            prompt: "select_account"
        })

        return res.redirect(authCodeUrl)
    } catch (err) {
        console.error("Erreur lors de la redirection vers microsoft auth, error : \n", err);
        return res.redirect(`${process.env.HOST_FRONT}?error=microsoft_redirect_error`)
    }
})


microsoftRouter.get("/auth/microsoft/callback", async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;


        //Controle de tout les champs necessaire dans la réponse avant de poursuivre sur la logique métier
        if (error) {
            console.error("Microsoft OAuth error:", { error, error_description });
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=microsoft_denied`)
        }
        if (!code) {
            console.error("Code indisponible dans la réponse microsoft")
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=microsoft_no_code`)
        }
        if (
            !state ||
            state !== req.session.microsoftOAuthState
        ) {
            console.error("Invalid Microsoft OAuth state");

            return res.redirect(
                `${process.env.FRONTEND_URL}/login?error=microsoft_invalid_state`
            );
        }
        delete req.session.microsoftOAuthState;


        //Echanhge du code d'autorisation contre token
        const token = await microsoftClient.acquireTokenByCode({
            code,
            scopes: microsoftScopes,
            redirectUri,
        })

        if (!token) {
            throw new Error("Token microsoft absent lors du callback auth")
        }

        const idTokenClaims = token.idTokenClaims;
        if (!idTokenClaims) {
            throw new Error("Id du token claims absent")
        }

        const microsoftId = idTokenClaims.oid;
        const microsoftTenantId = idTokenClaims.tid;

        const email = idTokenClaims.email ||
            idTokenClaims.preferred_username;

        const name =
            idTokenClaims.name || null;

    } catch (err) {
        console.error("Erreur lors du callback de microsoft auth, error : \n", err)
        return res.redirect(`${process.env.HOST_FRONT}?error=microsoft_auth_error`)
    }
})