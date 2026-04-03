import express from "express"
import type { Request, Response, Router } from "express"
import { User } from "../services/classUser"

const apiUser: Router = express.Router()

apiUser.post("/create", async (req: Request, res: Response) => {
    try {
        const {email, nom, prenom, password, cgu} = req.body

        //créer l'user dans la base de données
        const data = {
            email,
            nom,
            prenom,
            password,
            cgu
        }
        const user = new User()
        const created = await user.create(data)
        if(!created.success){
            return res.status(500).json({
                success:false,
                message: "Une erreur est survenue avec le serveur, nous n'avons pas pu créer votre compte utilisateur"
            })
        }

        //envoyer un email pour confirmer la création du compte
        

    } catch (err) {
        console.error(`Une erreur avec le serveur est survenue dans la route apiUSer/create, error : ${err}`)
        return res
            .status(500)
            .json({ success: false })
    }
})




export default apiUser