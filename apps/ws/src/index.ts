import WebSocket from 'ws';
import jwt, { JwtPayload } from "jsonwebtoken"
import prisma from "@repo/db"

const wss = new WebSocket.Server({ port: 8081 });


let gameMap = new Map<String, MyWebSOcket[]>()

interface MyWebSOcket extends WebSocket {
    x?: number,
    y?: number,
    userId?: string;
    spaceId?: string;
}

async function check_size(spaceId: string) {

    const space_details = await prisma.space.findFirst({
        where: {
            id: spaceId
        }
    })

    if (!space_details) {
        throw Error("wrong space id")
    }

    return space_details


}

async function decodeToken(token: string): Promise<any> {
    const key = "JWT_SECRET_PASSWORD"
    console.log("keyyyyyyyyyyyyyyyyyyyyyyyyyyyy:", key)
    console.log("tokennnnnnnnnnnnnnnnnnnn", token)
    try {
        const payload = jwt.verify(token, key);
        return payload;
    } catch (error) {
        console.error("Invalid token:", error);
        return null
    }
}

async function handleMove(data: { x: any; y: any; }, ws: MyWebSOcket) {


    console.log("wwwwwwwwwwwwwwww", ws.x, ws.y, ws.spaceId, ws.userId)

    const current_x = ws.x + data.x
    const current_y = ws.y + data.y

    const space_id = ws.spaceId

    if (ws.x == undefined || ws.y == undefined) {

        const res = JSON.stringify({
            "type": "Ws dont have position"
        })

        return ws.send(res)

    }


    if (!space_id) {
        const res = JSON.stringify({
            "type": "Token not Found"
        })

        return ws.send(res)
    }



    if (!isValidMove(current_x, current_y, ws.x, ws.y)) {
        return ws.send(JSON.stringify({
            "type": "movement-rejected",
            "payload": {
                x: ws.x,
                y: ws.y
            }
        }));
    }




    const space = await check_size(space_id!)

    console.log(current_x, current_y, space.width, space.height)

    if (current_x > space.width || current_y > space.height) {

        console.log("Movement out of wall")

        return ws.send(JSON.stringify({
            "type": "movement-rejected",
            "payload": {
                x: ws.x,
                y: ws.y
            }
        }))

    }

    const space_users = gameMap.get(ws.spaceId!)

    if (!space_users) {
        return
    }

    // const exists = space_users.some(ws => {
    //     if (ws.x == current_x && ws.y == current_y) {
    //         return false
    //     }

    //     return true
    // });

    const exists = space_users.some(ws => ws.x === current_x && ws.y === current_y);


    if (exists) {
        return ws.send(JSON.stringify({
            "type": "movement-rejected",
            "payload": {
                x: ws.x,
                y: ws.y
            }
        }))
    }



    ws.x = current_x
    ws.y = current_y


    const send_server = JSON.stringify(
        {
            "type": "movement",
            "payload": {
                "x": ws.x,
                "y": ws.y,
                "userId": ws.userId
            }

        })

    ws.send(send_server)

    console.log("Broadcast MOVEEEE")

    await broadcastMessage(send_server, space_id, ws)




    console.log("Movement done ", ws)
}



function isValidMove(current_x: number, current_y: number, previous_x: number, previous_y: number) {
    const x_distance = Math.abs(current_x - previous_x);
    const y_distance = Math.abs(current_y - previous_y);

    return (x_distance <= 1 && y_distance === 0) || (y_distance <= 1 && x_distance === 0);
}

async function handleLeave(ws: MyWebSOcket) {
    console.log("Handelling Leace")


    if (!ws.spaceId) {
        console.log("No Space iDDDDd ")
        return
    }

    const server_ans = JSON.stringify({
        type: "user-left",
        payload: {
            userId: ws.userId,
        },
    });

    if (gameMap.has(ws.spaceId)) {
        const space_users = gameMap.get(ws.spaceId);

        if (space_users) {
            const new_array = space_users.filter((sockets) => sockets.userId !== ws.userId);

            if (new_array.length > 0) {
                gameMap.set(ws.spaceId, new_array);
            } else {
                gameMap.delete(ws.spaceId);
            }

            broadcastMessage(server_ans, ws.spaceId, ws)
        }
    } else {
        console.log("No such Rooms")
    }

    ws.send(server_ans);
}


async function handleJoin(data: { spaceId: string; token: string }, ws: MyWebSOcket) {
    console.log(data, ws.OPEN)
    const spaceId = data.spaceId;
    const token = data.token;

    const userFromToken = await decodeToken(token);

    if (!spaceId) {
        console.log("No Space iDDDDd ")

        const res = JSON.stringify({
            "type": "No Space ID"
        })

        return ws.send(res)

    }

    if (!token) {
        const res = JSON.stringify({
            "type": "Invalid Token"
        })

        return ws.send(res)

    }

    console.log("===============>>>>>>>>>", userFromToken)

    if (!userFromToken || typeof userFromToken.id !== 'string') {
        throw new Error("Invalid token payload: missing user id");
    }

    if (!gameMap.has(spaceId)) {
        gameMap.set(spaceId, []);
    }

    const spaceUsers = gameMap.get(spaceId);

    if (!spaceUsers) {
        console.log("gffffffffffffffffffffffffffff")

        const res = JSON.stringify({
            "type": "Invalid Token"
        })

        return ws.send(res)

    }

    const exists = spaceUsers.some((socket) => {
        return socket.userId === userFromToken.id
    })

    if (exists) {

        const res = JSON.stringify({
            "type": "user Already  in Game"
        })

        ws.send(res)

        await broadcastMessage(res, spaceId, ws)

    } else {



        ws.userId = userFromToken.id
        ws.x = 0
        ws.y = 0
        ws.spaceId = spaceId

        console.log("Set Ws for next Response")
        console.log("====================")
        console.log(ws.userId, ws.x, ws.y, ws.spaceId, spaceId, data.spaceId)
        console.log("============")

        spaceUsers.push(ws);

        const res =
            JSON.stringify(
                {
                    "type": "space-joined",
                    "payload": {
                        "spawn": {
                            "x": 0,
                            "y": 0
                        },
                        "users": spaceUsers.map((ws_users) => { return ws_users.userId }).filter((sokcet) => sokcet != ws.userId)
                        // "users": spaceUsers.map((ws_users) => { return ws_users.userId })
                    }
                }
            )

        console.log("join res:::::", res)

        ws.send(res)


        const res2 =
            JSON.stringify(
                {
                    "type": "user-joined",
                    "payload": {
                        "x": 0,
                        "y": 0,
                        "userId": ws.userId
                        // "users": spaceUsers.map((ws_users) => { return ws_users.userId })
                    }
                }
            )


        await broadcastMessage(res2, spaceId, ws)
    }





}

async function broadcastMessage(message: string, space_id: string, ws: MyWebSOcket) {

    console.log("INSIDE BROADCAS==============T", space_id)


    const spaceUsers = gameMap.get(space_id);

    if (!spaceUsers) {
        console.log("gffffffffffffffffffffffffffff")
        const res = JSON.stringify({
            "type": "Invalid Token"
        })
        return

    }

    spaceUsers.forEach(ws_users => {

        if (ws_users != ws) {
            ws_users.send(message)
        }

    });



}

wss.on('connection', (ws: MyWebSOcket) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
        const data = JSON.parse(message.toString())

        if (!data.type) {
            const ans = JSON.stringify({
                "type": "error",
                "message": "type not provided"
            })
            ws.send(ans)
        }

        switch (data.type) {

            case "join":
                console.log("HAndle join req", data.payload)
                handleJoin(data.payload, ws)
                break

            case "move":
                handleMove(data.payload, ws)
                break


            default:
                const ans = JSON.stringify({
                    "type": "error",
                    "message": "invalid type"
                })
                ws.send(ans)



        }




    });

    ws.on('close', () => {
        handleLeave(ws)
        console.log('Client disconnected');
    });
});