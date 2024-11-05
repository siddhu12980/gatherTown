import express, { Request, Response } from "express"
import prisma from "@repo/db"

const app = express()

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "hello world"
  });
})

app.get("/data", async (req: Request, res: Response) => {
  const user = await prisma.user.findMany()
  res.json({
    user,
    message: "hello world"
  });
})

app.listen(3005)
