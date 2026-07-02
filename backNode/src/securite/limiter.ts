import rateLimit from "express-rate-limit"


const commonOption = {
    standardHeaders: true,
    legacyHeaders: false,
}

export const globalLimiter = rateLimit({
    ...commonOption,
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "dev" ? 10000 : 100,
    message: "Trop de tentative de communication, veuillez réessayez plus tard "
})

export const loginLimiter = rateLimit({
    ...commonOption,
    windowMs: 1000 * 60 * 15,
    limit: process.env.NODE_ENV === "dev" ? 10000 : 7,
    message: "Trop de tentative de connexion, veuillez réessayez plus tard"
})


export const registerLimiter = rateLimit({
    ...commonOption,
    windowMs: 1000 * 60 * 60 * 1,
    limit: process.env.NODE_ENV === "dev" ? 10000 : 3,
    message: {
        error: "Trop de tentatives d'inscription de compte, réessayez plus tard."
    }
});

export const forgotPasswordLimiter = rateLimit({
    ...commonOption,
    windowMs: 1000 * 60 * 15,
    limit: process.env.NODE_ENV === "dev" ? 10000 : 3,
    message: "Trop de tentatives d'oublie de mot de passe, veuillez réessayez plus tard"
})

export const feedBackLimiter = rateLimit({
    ...commonOption,
    windowMs: 1000 * 60 * 60 * 1,
    limit: process.env.NODE_ENV === "dev" ? 10000 : 20,
    message: "Envoie de feedback trop important, veuillez réessayez plus tard"
})