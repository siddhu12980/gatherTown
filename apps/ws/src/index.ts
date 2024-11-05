import WebSocket from 'ws';
import jwt, { JwtPayload } from "jsonwebtoken"


const wss = new WebSocket.Server({ port: 8081 });

let gameMap = new Map<String, MyWebSOcket[]>()

interface MyWebSOcket extends WebSocket {
    x?: number,
    y?: number,
    userId?: string;
    spaceId?: string;
}

async function decodeToken(token: string): Promise<any> {
    const key = process.env.JWT_KEY ?? "";

    try {
        const payload = jwt.verify(token, key);
        return payload;
    } catch (error) {
        console.error("Invalid token:", error);
        throw new Error("Token verification failed");
    }
}

async function handleMove(data: { x: any; y: any; }, ws: MyWebSOcket) {

    const current_x = ws.x + data.x
    const current_y = ws.y + data.y

    const space_users = gameMap.get(ws.spaceId!)

    if (!space_users) {
        return
    }

    const exists = space_users.some(ws => {
        if (ws.x == current_x && ws.y === current_y) {
            return false
        }
        return true
    });

    if (exists) {
        ws.send(JSON.stringify({
            "type": "movement-rejected",
            "payload": {
                x: ws.x,
                y: ws.y
            }
        }))

    } else {

        ws.x = current_x
        ws.y = current_y

        const send_server = JSON.stringify(
            {
                "type": "movement",
                "payload": {
                    "x": current_x,
                    "y": current_y,
                    "userId": ws.userId
                }

            })

        ws.send(send_server)



    }

    console.log("Movement done ", exists, ws)

}

async function handleLeave(ws: MyWebSOcket) {
    if (!ws.spaceId) return;

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

            if (new_array.length > 0 ) {
                gameMap.set(ws.spaceId, new_array);
            } else {
                gameMap.delete(ws.spaceId);
            }
        }
    }

    ws.send(server_ans);
}


async function handleJoin(data: { spaceId: string; token: string }, ws: MyWebSOcket) {
    const spaceId = data.spaceId;
    const token = data.token;

    const userFromToken = await decodeToken(token);

    if (!userFromToken || typeof userFromToken.id !== 'string') {
        throw new Error("Invalid token payload: missing user id");
    }

    if (!gameMap.has(spaceId)) {
        gameMap.set(spaceId, []);
    }

    const spaceUsers = gameMap.get(spaceId);

    if (!spaceUsers) {
        return
    }

    const exists = spaceUsers.some(ws => ws.userId === userFromToken.userId);

    ws.userId = userFromToken.userId
    ws.x = 0
    ws.y = 0
    ws.spaceId = spaceId


    if (spaceUsers && !exists) {
        spaceUsers.push(ws);
    }




    //broadcast all user that some user have joined them

    console.log("Socket Added to list")
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