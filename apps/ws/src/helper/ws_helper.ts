import prisma from "@repo/db";
import WebSocket from "ws";
import { flattenDiagnosticMessageText, reduceEachLeadingCommentRange, resolveTripleslashReference } from "typescript";

export interface SpaceInfo {
  width: number
  height: number
  //spaceElemets
  //may be add elements here  that may be good 
  //we have to store multiple elements here
}

export interface Space {
  [key: string]: SpaceInfo
}

export interface MyWebSOcket extends WebSocket {
  x?: number,
  y?: number,
  userId?: string;
  spaceId?: string;
}


export function check_user_exists_in_Space(gameMap: Map<Space, MyWebSOcket[]>, spaceId: string, my_user_id: string) {
  const spaceUsers = getSpace_users(spaceId, gameMap)
  if (!spaceUsers) {
    console.log("Nonone in this Space")
    return false
  }
  const exists = spaceUsers.some((socket) => {
    return socket.userId === my_user_id
  })
  if (!exists) {
    return false
  }
  return true
}

export function doesSpaceExist(spaceId: string, gameMap: Map<Space, MyWebSOcket[]>): boolean {
  for (const space of gameMap.keys()) {
    if (space.hasOwnProperty(spaceId)) {
      return true;
    }
  }
  return false;
}


export function getSpace_users(spaceId: string, gameMap: Map<Space, MyWebSOcket[]>): MyWebSOcket[] | null {
  const check_exists = doesSpaceExist(spaceId, gameMap)
  if (!check_exists) {
    return null
  }

  const space = getSpace(spaceId, gameMap)
  if (!spaceId) {
    return null
  }
  const users = gameMap.get(space!)

  if (!users) {
    return null
  }

  return users

}

export function setSpaceUsers(spaceId: string, gameMap: Map<Space, MyWebSOcket[]>, new_users: MyWebSOcket[]) {
  const spaces = getSpace(spaceId, gameMap)
  if (!spaces) {
    return null
  }
  gameMap.set(spaces, new_users)

}

export function deleteSpace(spaceId: string, gameMap: Map<Space, WebSocket[]>) {
  const spaces = getSpace(spaceId, gameMap)
  if (!spaces) {
    return null
  }
  gameMap.delete(spaces)

}

export async function get_Space_details(space_id: string) {
  try {
    const space_details = await prisma.space.findUnique(
      {
        where: {
          id: space_id
        },
        include: {
          elements: true
        }
      }
    )
    if (!space_id) {
      return null
    }

    return space_details

  }
  catch (e) {
    console.log("error", e)
    return null

  }

}

export function getSpace(spaceId: string, gameMap: Map<Space, MyWebSOcket[]>): Space | null {
  for (const space of gameMap.keys()) {
    if (space.hasOwnProperty(spaceId)) {
      return space
    }
  }
  return null
}

export function getSpaceKey(space: Space): String | null {
  const spaceId = Object.keys(space)[0]
  if (!spaceId) {
    return null
  }
  return spaceId
}
