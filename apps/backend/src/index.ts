import express, { Request, Response } from "express"
import prisma from "@repo/db"
import dotenv from "dotenv"
import appRouter from "./router/router"

dotenv.config()

const app = express()

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "hello world"
  });
})


app.use(appRouter)

app.listen(3005)
