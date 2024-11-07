import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import jwt from "jsonwebtoken"

declare global {
    namespace Express {
        export interface Request {
            user?: any;
        }
    }
}


export async function auth_middelware(req: Request, res: Response, next: NextFunction): Promise<any> {



    try {

        const header = req.headers.authorization

        if (!header) {
            return res.status(403).json({
                "message": "auth Header not found"
            })
        }
        const bearer_token = header?.split(" ")[1]

        if (!bearer_token) {
            return res.status(403).json({
                "message": "auth token found"
            })
        }

        let key = process.env.JWT_KEY || ""
        const payload = jwt.verify(bearer_token, key)

        req.user = payload

        console.log("USER payload:", payload)
        next()
    }
    catch (e) {
        return res.status(501).json({
            "message": "USer Auth middelware",
            "error": e
        })
    }
}



export async function admin_auth_middelware(req: Request, res: Response, next: NextFunction): Promise<any> {

    try {

        const header = req.headers.authorization

        if (!header) {
            return res.status(401).json({
                "message": "auth Header not found"
            })
        }

        const bearer_token = header?.split(" ")[1]

        if (!bearer_token) {
            return res.status(401).json({
                "message": "auth token found"
            })
        }

        console.log("TOKEN:", bearer_token)

        let key = process.env.JWT_KEY || ""

        console.log("sssssssssssssssssssssssssssssss", key)

        const payload = await jwt.verify(bearer_token, key, (err, token) => {
            if (err) {
                console.log(err);
                process.exit(1)

            }
            return token
        })


        console.log("ADMIN payload", payload)


        req.user = payload

        console.log("==============", req.user)


        if (req.user.role != "Admin") {

            return res.status(403).json({
                "message": "Unauthorized",

            })
        }

        next()



    }
    catch (e) {
        return res.status(403).json({
            "message": "Admin Auth middelware",
            "error": e
        })
    }
}