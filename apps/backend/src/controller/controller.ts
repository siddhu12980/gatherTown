import prisma from "@repo/db";
import { json, Request, Response, text } from "express";
import jwt from "jsonwebtoken"

enum Role {
  Admin = "admin",
  User = "user"
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

export async function signupUser(req: Request, res: Response): Promise<any> {
  try {
    const data: Signup = req.body;

    if (!data.username || !data.password || !data.type) {
      return res.status(400).json({
        message: "Missing Required Fields",
      });
    }

    console.log("INout Signup Data:")
    console.log(data)

    const find_user = await prisma.user.findUnique({
      where: {
        username: data.username
      }
    })

    if (find_user) {
      return res.status(400).json({
        "message": "user a;ready exists"
      })
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: data.password,
        role: data.type == "admin" ? "Admin" : "User",
      },
    });

    console.log(user)

    return res.status(200).json({ message: "User created successfully", "userId": user.id });
  } catch (error) {
    return res.status(500).json({ message: "User Already Exists", error });
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

export async function signinUser(req: Request, res: Response): Promise<any> {
  try {
    const data: Signin = req.body;
    if (!data.username || !data.password) {
      return res.status(400).json({
        message: "Missing Required Fields",
      });
    }

    const user_data = await prisma.user.findUnique({
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

    console.log(user_data)

    if (!user_data) {
      return res.status(403).json({ "message": "Invalid cred" })
    }

    const token = generateToken(user_data!)

    return res.status(200).json({ message: "User Login Success", token });
  } catch (error) {
    return res.status(500).json({ message: "Error Singin user", error });
  }
}


export async function updateMetaData(req: Request, res: Response): Promise<any> {

  try {

    const { avatarId } = req.body

    if (!avatarId) {
      return res.status(400).json({
        "message": "avatar id not provided"
      })
    }

    const avatar_id = await prisma.avatar.findUnique({
      where: {
        id: avatarId
      }
    })

    console.log("avatar id = ", avatarId, avatar_id)

    if (!avatar_id) {
      return res.status(400).json({
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

    return res.status(200).json({
      user: user_data
    })

  } catch (e) {
    return res.json({
      "message": "error updating metadata",
      "error": e
    })
  }

}


export async function getALlAvatar(req: Request, res: Response) {

  const avatars = await prisma.avatar.findMany({
  })

  res.json({ avatars })

}


export async function getUsersData(req: Request, res: Response): Promise<any> {
  let { id } = req.query;

  console.log(id)


  const idArray = (Array.isArray(id) ? id : [id])
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.replace(/^\[|\]$/g, ''));

  console.log("Given id:", idArray);




  if (idArray.length === 0) {
    return res.json({
      message: "Id not found"
    });
  }




  try {
    const users_data = await prisma.user.findMany({
      where: {
        id: {
          in: idArray
        }
      },
      select: {
        id: true,
        avatarId: true
      }
    });

    console.log("user data ", users_data)



    const user_avatar = await Promise.all(users_data.map(async (user: {
      id: string;
      avatarId: string | null;
    }) => {

      let avatar: { imageUrl: string | null } | null = null;

      if (user.avatarId) {
        avatar = await prisma.avatar.findUnique({
          where: {
            id: user.avatarId
          },
          select: {
            imageUrl: true
          }
        });
      }

      return {
        avatar: avatar ? avatar.imageUrl : "",
        userId: user.id
      };

    }));


    console.log(user_avatar)

    return res.json({
      "avatars": user_avatar
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "An error occurred" });
  }
}


export async function createSpace(req: Request, res: Response): Promise<any> {

  try {
    const { name, dimensions, mapId = null } = req.body

    if (!name || !dimensions) {
      return res.status(400).json({
        "message": "Paramater missing "
      })
    }


    const [x, y] = dimensions.split("x").map(Number);

    if (isNaN(x) || isNaN(y)) {
      return res.status(400).json({ message: "Invalid dimensions format" });
    }

    console.log(x, y)

    console.log("Space Creator :", req.user.id)


    if (!mapId) {

      const new_space = await prisma.space.create({
        data: {
          name: name,
          width: parseInt(x),
          height: parseInt(y),
          creatorId: req.user.id
        },
        include: {
          elements: true
        }
      })

      return res.status(200).json({
        spaceId: new_space.id,
        "message": "space created"
      })


    }


    const found_map = await prisma.map.findUnique({
      where: {
        id: mapId,

      },
      include: {
        mapElements: true


      }
    })


    if (!found_map) {
      return res.status(404).json({
        mapId,
        "message": "Map not Found with id"
      })
    }

    let space = await prisma.$transaction(async () => {

      const space = await prisma.space.create({
        data: {
          name: name,
          width: x,
          height: y,
          creatorId: req.user.id


        },
        include: {
          elements: true
        }

      });

      console.log(found_map.mapElements);

      await prisma.spaceElements.createMany({
        data: found_map.mapElements
          .map((e) => ({
            spaceId: space.id,
            elementId: e.elementId!,
            x: e.x!,
            y: e.y!,
          }))
          .filter((item) => item.elementId !== null),
      });

      console.log("new spaceeeeeeeeee", space)

      return space;

    });




    return res.status(201).json({
      "message": "txn done ",
      space

    });



  }
  catch (e) {
    return res.status(501).json({
      "message": "error while creating Space",
      "error": e
    })
  }

}


export async function deleteSpace(req: Request, res: Response): Promise<any> {
  try {
    const { spaceId } = req.params

    if (!spaceId) {
      return res.status(400).json({
        "message": "Space ID not Found"
      })
    }

    const find = await prisma.space.findUnique({
      where: {
        id: spaceId,
      }
    })

    if (!find) {
      return res.status(400).json({
        "message": "Space Doesnt exists"
      })
    }



    const space = await prisma.space.delete({
      where: {
        id: spaceId,
        creatorId: req.user.id
      },

    })

    console.log("Random Space:", space)

    if (!space) {
      return res.status(400).json({
        "message": "Cant delete Space"
      })
    }

    return res.status(200).json({
      "message": "Space Delete Success",
      "id": space.id
    })


  } catch (e) {


    return res.status(403).json({
      "message": "error deleting space",
      "error": e

    })
  }



}


export async function getAllSpace(req: Request, res: Response) {

  console.log("Checking space form userId:", req.user.id)

  const spaces = await prisma.space.findMany(
    {
      where: {
        creatorId: req.user.id
      },
      include: {
        elements: true
      }
    }
  )

  console.log(spaces)

  res.json({
    spaces
  })


}


export async function getArenaSpace(req: Request, res: Response): Promise<any> {

  try {

    const { spaceId } = req.params

    if (!spaceId) {
      return res.json({
        "message": "space Id not provided"
      })
    }



    const find = await prisma.space.findUnique({
      where: {
        id: spaceId,
      },

    })


    if (!find) {
      return res.status(400).json({
        "message": "Space Doesnt exists"
      })
    }


    const space_data = await prisma.space.findUnique(
      {
        where: {
          id: spaceId
        },
        include: {
          elements: true
        }

      }
    )


    const dimensions: string = `${space_data?.width}x${space_data?.height}`

    return res.json({


      ...space_data,
      "dimensions": dimensions
    }
    )

  }
  catch (e) {

    return res.status(500).json({
      "message": "error while getting",
      "error": e
    })

  }
}



export async function createEleemntInSpace(req: Request, res: Response): Promise<any> {

  try {

    const { elementId, spaceId, x, y } = req.body

    if (!elementId || !spaceId || !x || !y) {
      return res.json({
        "message": "Missing required fields"
      })
    }


    const check_space = await prisma.space.findUnique({
      where: {
        id: spaceId
      }
    })

    if (!check_space) {
      return res.status(400).json({
        "message": "invalid space id"
      })
    }

    if (parseInt(x) > check_space.width || parseInt(y) > check_space.height) {
      return res.status(400).json({
        "message": "Invalied element coordinates"
      })
    }

    const data = await prisma.space.update({
      where: {
        id: spaceId
      },
      data: {
        elements: {
          create: {
            x: parseInt(x),
            y: parseInt(y),
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
      return res.json({
        "message": "Faild updating space"
      })
    }

    return res.json({
      id: data,
      spaceId: spaceId,
      "message": "element added in space"
    })
  }
  catch (e) {
    return res.json({
      "message": "while adding element in space",
      "error": e
    })
  }

}

export async function deleteElementFromSpacea(req: Request, res: Response): Promise<any> {

  try {
    const { id } = req.body

    if (!id) {
      return res.json({
        "message": "element element id/space id not provided"
      })
    }


    // await prisma.space.update({
    //   where: {
    //     id: spaceId,
    //     creatorId: req.user.id
    //   },
    //   data: {
    //     elements: {
    //       delete: [
    //         { id: id }
    //       ]
    //     }
    //   }
    // });

    const deletedElement = await prisma.spaceElements.delete({
      where: {
        id: id,
      },
    });



    return res.json({
      id,
      "message": "Space Element element removed from space"

    })
  } catch (e) {
    return res.json({
      "message": "Element Delete Failed",
      "error": e
    })
  }


}

export async function getAllElement(req: Request, res: Response) {

  const all_elements = await prisma.element.findMany()

  res.json({
    "elements": all_elements
  })

}



export async function createElementByAdmin(req: Request, res: Response) {

  const { width, height, statics = "false", imageUrl } = req.body

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


export async function updateElementAdmin(req: Request, res: Response): Promise<any> {
  try {

    const { id } = req.params
    const { imageUrl } = req.body

    console.log(id, imageUrl)

    if (!id || !imageUrl) {
      return res.json({
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

    return res.json(e)
  } catch (e) {
    return res.json({
      "message": "update element failed",
      "error": e
    })
  }

}


export async function createAvatarAdminimageUrl(req: Request, res: Response): Promise<any> {

  try {
    const { imageUrl, name } = req.body

    if (!imageUrl || !name) {
      return res.json({
        "message": "missing requried parms"
      })
    }

    const new_avatar = await prisma.avatar.create({
      data: {
        imageUrl,
        name
      }
    })
    console.log("avatar created with id ", new_avatar.id)
    return res.json({
      "message": "avatar created",
      "avatarId": (new_avatar).id
    })
  } catch (e) {
    return res.json({
      "message": "create avatar failed",
      "error": e
    })
  }


}

export async function createMapAdmin(req: Request, res: Response): Promise<any> {
  console.log("Start creating Map")
  try {
    const { thumbnail, dimensions, name, defaultElements } = req.body

    if (!thumbnail || !dimensions || !name || !defaultElements) {
      res.json({
        "message": "missing req params"
      })
    }

    const h = dimensions.split("x")[0]
    const w = dimensions.split("x")[1]

    console.log(h, w)


    const main_map = await prisma.map.create({
      data: {
        width: parseInt(w),
        height: parseInt(h),
        name,
        thumbnail,
        mapElements: {
          create: defaultElements.map((ele: { x: any; y: any; elementId: any; }) => ({
            x: ele.x,
            y: ele.y,
            element: {
              connect: {
                id: ele.elementId
              }
            }
          }))
        }
      }
    })

    console.log(JSON.stringify(main_map))

    res.json({
      "message": "map created sucessfully",
      id: main_map.id
    })
  }
  catch (e) {
    return res.json({
      "message": "error creating map",
      "error": e
    })
  }

}



export async function getAdminAllData(req: Request, res: Response): Promise<any> {
  try {

    const all_element = await prisma.element.findMany()


    const all_map = await prisma.map.findMany({
      include: {
        mapElements: true
      }
    })

    const all_avatar = await prisma.avatar.findMany({

    })

    const all_map_elements = await prisma.mapElements.findMany()

    const all_users = await prisma.user.findMany({

      select: {
        id: true,
        avatarId: true,
        password: false
      }
    })

    const all_space = await prisma.space.findMany(
      {
        include: {
          elements: true
        }
      }
    )

    const all_space_element = await prisma.spaceElements.findMany()


    return res.json({
      all_element,
      all_map,
      all_avatar,
      all_map_elements,
      all_users,
      all_space_element,
      all_space
    })




  }
  catch (e) {
    return res.json({
      "message": "Get all data failed",
      "error": e
    })
  }

}


export const resetDatabase = async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.mapElements.deleteMany({});
    await prisma.spaceElements.deleteMany({});
    await prisma.element.deleteMany({});
    await prisma.map.deleteMany({});
    await prisma.space.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.avatar.deleteMany({});

    return res.json({ message: 'Database reset successfully' });
  } catch (error) {
    console.error('Error resetting database:', error);
    return res.status(500).json({ message: 'Error resetting database' });
  }
};
