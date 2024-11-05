import { NextFunction,Request,Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import jwt from "jsonwebtoken"


export async function auth_middelware(req:Request,res:Response,next:NextFunction){

    const header = req.headers.authorization

    if(!header){
        res.status(401).json({
            "message":"auth Header not found"
        })
    }
    console.log(header)
    const bearer_token = header?.split("")[1]

    if(!bearer_token){
        res.status(401).json({
            "message":"auth token found"
        })
    }

    let key = process.env.JWT_KEY || ""
    const payload =  jwt.verify(bearer_token!,key)

    req.body.user = payload

    console.log(payload)
}