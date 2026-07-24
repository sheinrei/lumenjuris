import express from "express";
import type { Request, Response } from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import path from "path";
//import { Llm } from "./services/classLlm"
import { User } from "./src/services/classUser.js";
import routerGoogleAuth from "./src/route/authGoogle.js";
import routerLlm from "./src/route/apiLlm.js";
import routerUser from "./src/route/apiUser.js";
import routerEnterprise from "./src/route/apiEnterprise.js";
import routerContractHistory from "./src/route/apiContractHistory.js";
import routerChatHistory from "./src/route/apiChatHistory.js";
import routerBilling from "./src/route/apiBilling.js";
import routerVeille from "./src/route/apiVeille.js";
import routerUserUploads from "./src/route/apiUserUploads.js";
import routerFeedback from "./src/route/apiFeedback.js";
import routerTemplate from "./src/route/apiTemplate.js";
import routerSignature from "./src/route/apiSignature.js";
import routerContract from "./src/route/apiContract.js";
import routerClause from "./src/route/apiClause.js";
import routerAdmin from "./src/route/apiAdmin.js";
import routerNegotiation from "./src/route/apiNegotiation.js";
import routerLegalWatch from "./src/route/apiLegalWatch.js";

import routerFeatureEvent from "./src/route/apiFeatureEvent.js";
import cors from "cors";
import { seedBootstrapUsers } from "./src/services/bootstrapUsers.js";
import { seedPlans } from "./src/services/planSeeder.js";
import { Mailer } from "./src/infrastructure/mailer/classMailer.js";
import { globalLimiter } from "./src/securite/limiter.js";
import { authMiddleware } from "./src/middleware/authMiddleware.js";
import { prisma } from "./prisma/singletonPrisma.js";
import fs from "fs";
import { internalApiKeyMiddleware } from "./src/middleware/internalApiKeyMiddleware.js";
// import { internalApiKeyMiddleware } from "./middleware/internalApiKeyMiddleware";


/**
 * Préparation du serveur nodejs/express pour ce backend
 * Ici sera traité toute les opérations avec la base de données
 */

const HOST_PROXY: string =
  process.env.HOST_PROXY ||
  (process.env.NODE_ENV == "dev"
    ? "http://localhost:3000"
    : "https://proxy.lumenjuris.com");

const app = express();

//SECURITE
app.set("etag", false);
const port = process.env.PORT || 3020;
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  console.log("[backnode] requête :", req.method, req.path, "| origin :", req.headers.origin, "| cookies :", req.headers.cookie);
  next();
});
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "dev"
        ? ["http://localhost:5173", "http://localhost:3020", HOST_PROXY]
        : HOST_PROXY,
    credentials: true,
  }),
);
app.use(globalLimiter);
app.set("trust-proxy", 1);
app.use(internalApiKeyMiddleware);

app.use("/", routerGoogleAuth);
app.use("/llm", routerLlm);
app.use("/user", routerUser);
app.use("/enterprise", routerEnterprise);
app.use("/contract-history", routerContractHistory);
app.use("/chat-history", routerChatHistory);
app.use("/billing", routerBilling);
app.use("/veille", routerVeille);
app.use("/legal-watch", routerLegalWatch);
app.use("/user-uploads", routerUserUploads);
app.use("/feedback", routerFeedback);
app.use("/template", routerTemplate);
app.use("/signature-envelope", routerSignature);
app.use("/contract", routerContract);
app.use("/clause", routerClause);
app.use("/admin", routerAdmin);
app.use("/feature-event", routerFeatureEvent);
app.use("/negotiation", routerNegotiation);

app.get("/health", (req: Request, res: Response) => {
  return res.status(200).json({
    health: true,
    port,
  });
});

app.get("/userassets/:filename", authMiddleware, async (req, res) => {
  try {
    const filename = req.params.filename as string;
    const userId = Number(req.idUser);
    const userUpload = await prisma.userUpload.findUnique({ where: { userId } });
    const images = (userUpload?.uploadedImages ?? []) as { filename: string }[];
    const owned = images.some(img => img.filename === filename);

    if (!owned) {
      return res.status(403).json({ success: false, message: "Accès refusé à ce fichier." });
    }

    const filepath = path.join(process.cwd(), "userassets", filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: "Fichier non trouvé." });
    }

    return res.sendFile(filepath);
  } catch (error) {
    console.error("Erreur assets :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

async function sandbox() {
  //Vous pouvez faire vos testes içi
  console.log("Sandbox running");
  const user = await new User().create({
    email: "julienmessage@gmail.com",
    nom: "Doe",
    prenom: "Serge",
    password: "azertyuioP1.",
    cgu: true,
  });
  console.log(user, " ");
}

app.listen(port, async () => {
  console.log(`Serveur backend nodejs running on port ${port}`);
  
  try {
    await seedBootstrapUsers();
    new Mailer("l.beaute@laposte.net").initTransporter();
  } catch (err) {
    console.error(
      "Erreur lors de l'initialisation des utilisateurs de bootstrap:",
      err,
    );
  }
  try {
    await seedPlans();
  } catch (err) {
    console.error("Erreur lors du seeding des plans:", err);
  }
  //await sandbox()
});
