import prisma from "@repo/db";
import Role from "@repo/db"
import { Request, Response } from "express";



interface Signup {
  username: string,
  password: string,
  type: Role
}

async function signupUser(req: Request, res: Response) {
  const data: Signup = req.body;

  if (!data.username || !data.password || !data.type) {
    return res.json({
      message: "Missing Required Fields",
    });
  }

  try {
    await prisma.user.create({
      data: {
        username: data.username,
        password: data.password,
        role: data.type,
      },
    });

    res.json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
}



