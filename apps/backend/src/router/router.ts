import { Router } from "express";

const appRouter = Router()

appRouter.get("/signup", signup);

export default appRouter
