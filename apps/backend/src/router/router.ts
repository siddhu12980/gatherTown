import { Router } from "express";
import { createAvatarAdminimageUrl, createEleemntInSpace, createElementByAdmin, createMapAdmin, createSpace, deleteElement, deleteSpace, getALlAvatar, getAllElement, getAllSpace, getArenaSpace, getUsersData, signinUser, signupUser, updateElementAdmin, updateMetaData } from "../controller/controller";
import { auth_middelware } from "../middelware/middelware";

const appRouter = Router()

appRouter.get("/signup", signupUser);
appRouter.get("/signin", signinUser)

appRouter.post("/space", createSpace)
appRouter.post("/space/element",createEleemntInSpace)
appRouter.get("/space/all", getAllSpace)
appRouter.delete("/space/element", deleteElement)
appRouter.delete("/space/:spaceId", deleteSpace)
appRouter.get("/space/:spaceId", getArenaSpace)


appRouter.get("/elements", getAllElement)

appRouter.get("/avatars", getALlAvatar)


appRouter.get("/user/metadata/bulk", auth_middelware, getUsersData)
appRouter.post("/user/metadata", auth_middelware, updateMetaData)


appRouter.post("/admin/element",createElementByAdmin)
appRouter.post("/admin/element/:element",updateElementAdmin)
appRouter.post("/admin/avatar",createAvatarAdminimageUrl)
appRouter.post("admin/map",createMapAdmin)




export default appRouter
