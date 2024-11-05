import prisma from "@repo/db";
import { json, Request, Response } from "express";
import jwt from "jsonwebtoken"

enum Role {
  Admin = "Admin",
  User = "User"
}

interface Signup {
  username: string,
  password: string,
  type: Role
}

interface Signin {
  username: string,
  password: string,
}

export async function signupUser(req: Request, res: Response) {
  const data: Signup = req.body;

  if (!data.username || !data.password || !data.type) {
    res.json({
      message: "Missing Required Fields",
    });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: data.password,
        role: data.type,
      },
    });

    res.status(200).json({ message: "User created successfully", "userId": user.id });
  } catch (error) {
    res.status(500).json({ message: "User Already Exists", error });
  }
}

interface Token {
  id: string,
  username: string,
  role: any,
  avatarId: string | null
}

function generateToken(user_data: Token) {
  if (!user_data.avatarId) {
    user_data.avatarId = ""
  }

  const key = process.env.JWT_KEY || ""

  const token = jwt.sign(user_data, key, {
    expiresIn: 180000,
  })

  console.log(token)

  return token

}

export async function signinUser(req: Request, res: Response) {
  const data: Signin = req.body;

  if (!data.username || !data.password) {
    res.json({
      message: "Missing Required Fields",
    });
  }
  try {

    const user_data = await prisma.user.findFirst({
      where: {
        username: data.username,
        password: data.password,
      }, select: {
        id: true,
        username: true,
        role: true,
        avatarId: true
      }
    });

    if (!user_data) {
      res.status(400).json({ "message": "user Not FOund" })
    }

    const token = generateToken(user_data!)

    res.json({ message: "User Login Success", token });
  } catch (error) {
    res.status(500).json({ message: "Error Singin user", error });
  }
}


export async function updateMetaData(req: Request, res: Response) {

  const { avatarId } = req.body

  if (!avatarId) {
    res.status(400).json({
      "message": "avatar id not provided"
    })
  }

  const avatar_id = prisma.avatar.findFirst({
    where: {
      id: avatarId
    }
  })

  if (!avatar_id) {
    res.status(400).json({
      "message": "Avatar Not Found"
    })
  }

  const user_data = prisma.user.update({
    where: {
      id: req.body.user.id
    },
    data: {
      avatar: {
        connect: {
          id: avatarId
        }
      }
    }

  })

  res.json({
    user: user_data
  })

}


export async function getALlAvatar(req: Request, res: Response) {

  const avatars = prisma.avatar.findMany()

  res.json({ avatars })

}

export async function getUsersData(req: Request, res: Response) {

  const { id } = req.query

  console.log(id)

  if (id) {
    console.log("Id is here", id)
  }

  const users_data = prisma.user.findMany({
    select: {
      id: true,
      avatarId: true
    },
  })

  const user_avatar = (await users_data).map((user) => {

    const avatar = prisma.avatar.findUnique({
      where: {
        id: user.avatarId || ""
      },
      select: {
        imageUrl: true
      }
    })

    if (!avatar) {
      const avatar = ""
    }

    const userId = user.avatarId

    return {
      userId,
      avatar
    }

  })

}

export async function createSpace(req: Request, res: Response) {

  const { name, dimensions, mapId } = req.body

  if (!name || !dimensions || !mapId) {
    res.json({
      "message": "Paramater missing "
    })
  }
  const found_map = prisma.map.findUnique({
    where: {
      id: mapId
    }
  })

  if (!found_map) {
    res.json({
      mapId,
      "message": "Map not Found with id"
    })
  }

  const x = dimensions.split("x")[0]
  const y = dimensions.split("y")[1]

  const new_space = prisma.space.create({
    data: {
      name: name,
      width: y,
      height: x,
      creatorId: req.body.user.id
    }
  })

  res.json({
    id: (await new_space).id,
    "message": "space created"
  })

}


export async function deleteSpace(req: Request, res: Response) {

  const { spaceId } = req.params

  if (!spaceId) {
    res.json({
      "message": "Space ID not Found"
    })
  }

  await prisma.space.delete({
    where: {
      id: spaceId
    }
  })



}


export async function getAllSpace(req: Request, res: Response) {

  const spaces = await prisma.space.findMany()

  res.json({
    spaces
  })


}


export async function getArenaSpace(req: Request, res: Response) {

  const { spaceId } = req.params

  if (!spaceId) {
    res.json({
      "message": "space Id not provided"
    })
  }

  const space_data = prisma.space.findMany(
    {
      select: {
        elements: true,
        width: true,
        height: true,
        thumbnail: true
      }
    }
  )

  res.json(space_data)

}



export async function createEleemntInSpace(req: Request, res: Response) {

  const { elementId, spaceId, x, y } = req.body

  if (!elementId || !spaceId || !x || !y) {
    res.json({
      "message": "Missing required fields"
    })
  }

  const data = await prisma.space.update({
    where: {
      id: spaceId
    },
    data: {
      elements: {
        create: {
          x: x,
          y: y,
          element: {
            connect: {
              id: elementId
            },

          }
        }
      }
    },
    select: {
      id: true
    }
  });

  if (!data) {
    res.json({
      "message": "Faild updating space"
    })
  }

  res.json(data)

}

export async function deleteElement(req: Request, res: Response) {
  const { id } = req.body

  if (!id) {
    res.json({
      "message": "element id not provided"
    })
  }

  await prisma.element.delete({
    where: {
      id
    },
  })


  res.json({
    id
  })



}

export async function getAllElement(req: Request, res: Response) {

  const all_elements = await prisma.element.findMany()

  res.json({
    "elements": all_elements
  })


}


export async function createElementByAdmin(req: Request, res: Response) {

  const { width, height, statics, imageUrl } = req.body

  if (!width || !height || !statics || !imageUrl) {
    res.json({
      "message": "minssing required fields"
    })
  }

  const new_element = await prisma.element.create({
    data: {
      width,
      height,
      imageUrl,
      static: statics
    }
  })


  res.json({
    id: new_element.id,
    "message": "element created Success"
  })



}


export async function updateElementAdmin(req: Request, res: Response) {

  const { id } = req.params
  const { imageUrl } = req.body

  if (!id || !imageUrl) {
    res.json({
      "message": "missing req pparamaters"
    })
  }

  const e = await prisma.element.update({
    where: {
      id: id
    },
    data: {
      imageUrl
    }
  })

  res.json(e)

}


export async function createAvatarAdminimageUrl(req: Request, res: Response) {

  const { imageUrl, name } = req.body

  if (!imageUrl || !name) {
    res.json({
      "message": "missing requried parms"
    })
  }

  const new_avatar = await prisma.avatar.create({
    data: {
      imageUrl,
      name
    }
  })

  res.json({
    "id": (new_avatar).id
  })


}

export async function createMapAdmin(req: Request, res: Response) {

  const { thumbnail, dimensions, name, defaultElements } = req.body

  if (!thumbnail || !dimensions || !name || !defaultElements) {
    res.json({
      "message": "missing req params"
    })
  }


  



}













