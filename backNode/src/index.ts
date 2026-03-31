import express from "express"
import type { Request, Response } from "express"

import "dotenv/config";







/**
 * Préparation du serveur nodejs/express pour ce backend
 * Ici sera traité toute les opérations avec la base de données
 */

const app = express()
const port = process.env.PORT || 3020

app.get("/health", (req: Request, res: Response) => {

    return res.status(200).json({
        health: true,
        port
    })
})








app.listen(port, () => {
    console.log(`Serveur backend nodejs running on port ${port}`);
    console.log("env", process.env.DATABASE_PASSWORD)
})