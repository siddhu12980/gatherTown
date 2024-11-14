import express, { Request, Response } from "express"
import prisma from "@repo/db"
import dotenv from "dotenv"
import appRouter from "./router/router"
import { resetDatabase } from "./controller/controller"

dotenv.config()

const app = express()
app.use(express.json())

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "hello world123"
  });
})

app.get("/reset", resetDatabase)


app.use("/api/v1", appRouter)

app.listen(3005)
