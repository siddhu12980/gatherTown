import { Router } from "express";
import { createAvatarAdminimageUrl, createEleemntInSpace, createElementByAdmin, createMapAdmin, createSpace, deleteElementFromSpacea, deleteSpace, getAdminAllData, getALlAvatar, getAllElement, getAllSpace, getArenaSpace, getUsersData, signinUser, signupUser, updateElementAdmin, updateMetaData } from "../controller/controller";
import { admin_auth_middelware, auth_middelware } from "../middelware/middelware";


const appRouter = Router()


appRouter.post("/signup", signupUser);
appRouter.post("/signin", signinUser)

appRouter.post("/space", auth_middelware, createSpace)
appRouter.post("/space/element", auth_middelware, createEleemntInSpace)   //
appRouter.get("/space/all", auth_middelware, getAllSpace)
appRouter.delete("/space/element", auth_middelware, deleteElementFromSpacea)   //
appRouter.delete("/space/:spaceId", auth_middelware, deleteSpace)    //
appRouter.get("/space/:spaceId", getArenaSpace) //


appRouter.get("/elements", getAllElement)   //
appRouter.get("/avatars", getALlAvatar) //


appRouter.get("/user/metadata/bulk", getUsersData) //
appRouter.post("/user/metadata", auth_middelware, updateMetaData) //

appRouter.post("/admin/map",admin_auth_middelware, createMapAdmin)
appRouter.post("/admin/element",admin_auth_middelware, createElementByAdmin)
appRouter.put("/admin/element/:id", admin_auth_middelware,updateElementAdmin)
appRouter.post("/admin/avatar", admin_auth_middelware,createAvatarAdminimageUrl)   //
appRouter.get("/admin/all", getAdminAllData)


export default appRouter
