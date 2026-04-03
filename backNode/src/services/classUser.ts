import { prisma } from "../../prisma/singletonPrisma"
import bcrypt from "bcrypt"

type createDataDTO = {
    email: string
    nom: string
    prenom: string
    password: string,
    cgu:boolean
}

type dataUpdatedDTO = {
    email? : string
    nom? : string
    prenom? : string
    password? : string
}

type returnData = {
    success : boolean
    message? : string
    data ? : Object
}



export class User {

    //Cacthing d'erreur global 
    private errorCatching(err: unknown, fn: string) {
        const e = err as any;

        console.error(`Erreur dans la fonction ${fn} : \n\n`, err);

        //object des erreur de contrainte
        const constraintMap: Record<string, string> = {
            User_email_key: "Cet email est déjà utilisé.",
        }

        //Erreur de contrainte
        if (e?.code === "P2002") {
            const message: string = e?.message || "";
            //Gestion erreur champ unique non respecté
            for (const key in constraintMap) {
                if (message.includes(key)) {
                    return {
                        success: false,
                        message: constraintMap[key],
                    };
                }
            }

            return {
                success: false,
                message: "Une valeur unique est déjà utilisée.",
            };
        }

        if(e?.code === "P2005"){
            return{
                success:false,
                message : "Votre compte n'a pu être retrouvé"
            }
        }

        return {
            success: false,
            message: "Une erreur est survenue avec le serveur, merci de réessayer plus tard.",
        };
    }


    //Hash d'un password avec bcrypt
    private async hashPassword(password: string): Promise<string> {
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound)
        const passwordHash = await bcrypt.hash(password, salt)
        return passwordHash
    }


    //Création d'un nouvel utilisateur dans la bdd
    async create(data: createDataDTO) {
        try {
            const { email, nom, prenom, password, cgu } = data
            const passwordHash = await this.hashPassword(password)
            const newUser = await prisma.user.create({
                data: {
                    email,
                    nom,
                    prenom,
                    password: passwordHash,
                    cgu
                }
            })

            console.log("New user create with prisma : ", newUser)
            return {
                success: true,
                data: newUser,
            }
        } catch (err) {
            return this.errorCatching(err, "User.create")
        }
    }


    //Authentification d'un utilisateur lors d'une connexion
    async authenticate(password: string, email: string):Promise<returnData> {
        try {

            const hashedPassword = await prisma.user.findUnique({
                where: { email }
            })

            if (!hashedPassword?.password) return {success : false, message : "Email ou mot de passe invalide"}

            const verifyPassword = await bcrypt.compare(password, hashedPassword?.password)
            
            return {
                success:verifyPassword,
                message : verifyPassword ? "Connexion réussite" : "Email ou mot de passe invalide"
            
            }

        } catch (err) {
            return this.errorCatching(err, "User.authenticate")
        }
    }


    //Mise à jour des données d'un utilisateur
    async update(idUser: number, dataUpdated:dataUpdatedDTO): Promise<returnData> {
        try {
            if(dataUpdated.password){
                dataUpdated.password = await this.hashPassword(dataUpdated.password)
            }
            const userUpdated = await prisma.user.update({
                where : { idUser :  idUser },
                data : {...dataUpdated}
            })
            return {
                success: true,
                message: "Les informations ont été mises à jour",
                data: userUpdated
            }
        } catch (err) {
            return this.errorCatching(err, "User.update")
        }
    }
}