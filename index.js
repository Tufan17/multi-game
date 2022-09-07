const {
    json
} = require("express");
const http = require("http");
const moment = require("moment");
const wsServing = require("websocket");
const terminal = require("terminal-kit").terminal;
const isTTY = process.stdout.isTTY;

const PORT = 8080;
const HOST = '0.0.0.0';


let server = http.createServer();

server.listen(PORT, HOST, function (err) {
    isTTY && terminal(moment().locale("tr").format("HH:mm:ss L"), " : ").green("Using port 8080, listenning now !\n");
});



let ws = new wsServing.server({
    httpServer: server,
    autoAcceptConnections: true
});

/**
 * @type {Map<string, {id:number, name:string, others:Object, socket:wsServing.connection,searching:boolean,matched:number,result:{correctCount:number,time:number}}>}
 */
let users = new Map();
let rooms = Array();
let leadBoard = [];
var data = {};



ws.addListener("connect", socket => {
    let userid = null;

    isTTY && terminal(moment().locale("tr").format("HH:mm:ss L"), " : ").green(socket.remoteAddress).white(" ").green("Client Connected")("\n");
    socket.addListener("message", async ({
        utf8Data
    }) => {
        let {
            type,
            ...request
        } = JSON.parse(utf8Data);

        switch (type) {
            case "init":
                terminal().green(request.user.id + "->" + request.user.name + "->" + request.user.avatar + "\n");
                break;
            case "createRoom":
                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });
                var createRoomUser = false;
                if (rooms.length > 0) {
                    rooms.forEach((element) => {
                        element.users.forEach((user) => {
                            if (user.id == request.user.id) {
                                createRoomUser = true;
                            }
                        });
                    });
                }
                if (createRoomUser) {
                    users.get(request.user.id).socket.send(JSON.stringify({
                        "type": "Err",
                        "message": "Zaten bir odanız var..",
                    }));
                } else {
                    
                    try {
                        let user = [];
                        user.push(request.user);
                        terminal().green("->").red(JSON.stringify(request.room))("\n");
                        rooms.push({
                            "users": user,
                            "room": request.room,
                        });
                        users.get(request.user.id).socket.send(JSON.stringify({
                            "type": "createRoom",
                            "room": request.room,
                            "message": "Odananız oluşturulmuştur...",
                        }));
                    } catch (e) {
                        users.get(request.user.id).socket.send(JSON.stringify({
                            "type": "Err",
                            "message": "Odananız oluşturulurken bir hata oluştu...",
                        }));
                    }
                }

                break;
            case "rooms":
                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });
                terminal(request.user.id).green("<-").red(JSON.stringify(rooms))("\n");
                users.get(request.user.id).socket.send(JSON.stringify({
                    type: "rooms",
                    rooms: rooms,
                }));
                break;
            case "enterRoom":
                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });
                terminal("-->").green("Odaya girme isteği")("\n").red(JSON.stringify(request.user))("\n");
                rooms.forEach((element) => {
                    let user = [];

                    if (element.room.id == request.id) {

                        user = element.users;
                        var set_user = true;
                        user.forEach((us) => {
                            if (us.id == request.user.id) {
                                set_user = false;
                            }
                        });
                        if (set_user) {
                            terminal("--><---")("\n");
                            user.push(request.user);
                        }
                        element.users = user;

                        terminal("-->").red(JSON.stringify(rooms))("\n");

                        terminal("-----------------").red(JSON.stringify(element))("\n");

                        if (user.length == element.room.userCount) {
                            user.forEach((getUser) => {
                                users.get(getUser.id).socket.send(JSON.stringify({
                                    "type": "questionRequest",
                                    "id": element.room.id,
                                    "questionCount": element.room.questionCount
                                }));
                            });
                        } else {
                            user.forEach((getUser) => {
                                terminal("-->").green("***********");
                                users.get(getUser.id).socket.send(JSON.stringify({
                                    "type": "waitingUsers",
                                    "users": user,
                                    "message": "Odanaya Katıldınız...",
                                }));
                            });
                        }





                    }





                });
                terminal("\n").green("------>").red(rooms.length);
                break;
            case "sendingQuestion":
                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });
                terminal().red("---").blue(JSON.stringify(request))("\n");
                rooms.forEach((element) => {
                    if (element.room.id == request.room.id) {
                        element.users.forEach((user) => {
                            users.get(user.id).socket.send(JSON.stringify({
                                "type": "groupQuestion",
                                "question": request.question,
                                "roomID": request.room.id,
                            }));
                        });
                    }


                });
                leadBoard.pop();
                break;
            case "questionResult":

                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });
                terminal(">").red("------------").green(JSON.stringify(request.room))("\n");


                leadBoard.push({
                    "id": request.room.id,
                    "user": request.user
                });

                var userLeadBoard = [];

                leadBoard.forEach((element) => {
                    if (request.room.id == element.id) {
                        userLeadBoard.push(element.user);
                    }

                });

                leadBoard.forEach((element) => {
                    terminal("-->").green("***********");
                    users.get(element.user.id).socket.send(JSON.stringify({
                        "type": "questionLeadBoard",
                        "leadBoard": userLeadBoard,
                    }));
                });

                terminal("\n")("-->").green(JSON.stringify(leadBoard[0])).red("\n");

                setTimeout(() => {

                    leadBoard.forEach((element) => {
                        users.get(element.user.id).socket.send(JSON.stringify({
                            "type": "questionRequest",
                            "id": request.room.id,
                        }));
                    });

                }, 2000);
                break;
            case "finishGroupLead":
                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });

                terminal("\n")("-->").green(JSON.stringify(leadBoard)).red("<<--\n");
                var point = 0;
                var winner;

                leadBoard.forEach((element) => {

                    if (point <= element.user.myPoint) {
                        point = element.user.myPoint;
                        winner = element.user;
                    }
                });
                request.users.forEach((element) => {

                    users.get(element.id).socket.send(JSON.stringify({
                        "type": "finishGame",
                        "winner": winner,
                    }));
                });

                terminal("\n").green(">").green(JSON.stringify(rooms)).red("<")("\n");
                try {
                    var index;
                    for (var i = 0; i < rooms.length; i++) {

                        for (var i = 0; i < rooms.length; i++) {
                            if (rooms[i].room.userCount == rooms[i].users.length && rooms[i].room.id == request.room.id) {
                                index = i;
                                break;
                            }
                        }
                    }
                    if (index != null) {
                        delete rooms[index];
                    }
                } catch (e) {
                    rooms = [];

                    terminal().green("-----BURADA------");
                    if (rooms[0] == [null]) {
                        rooms = [];
                        terminal().green("-----geldi------");

                    }
                }


                break;
            case "randomRoom":
                users.set(request.user.id, {
                    id: request.user.id,
                    name: request.user.name,
                    avatar: request.user.avatar,
                    socket,
                });








                terminal("-->").green("Odaya girme isteği")("\n").red(JSON.stringify(request.user))("\n");
                rooms.forEach((element) => {
                    let user = [];

                    if (element.users.length < element.room.userCount) {
                        terminal(">").green("Odaya girme isteği")("\n").red(JSON.stringify(element))("\n");

                        users.get(request.user.id).socket.send(JSON.stringify({
                            "type": "randomRoom",
                            "room": element,
                            "questionCount": element.room.questionCount
                        }));
                        user = element.users;
                        var set_user = true;
                        user.forEach((us) => {
                            if (us.id == request.user.id) {
                                set_user = false;
                            }
                        });
                        if (set_user) {
                            terminal("--><---")("\n");
                            user.push(request.user);
                        }
                        element.users = user;

                        terminal("-->").red(JSON.stringify(rooms))("\n");

                        terminal("-----------------").red(JSON.stringify(element))("\n");

                        setTimeout(() => {
                            if (user.length == element.room.userCount) {
                                user.forEach((getUser) => {
                                    users.get(getUser.id).socket.send(JSON.stringify({
                                        "type": "questionRequest",
                                        "id": element.room.id,
                                        "questionCount": element.room.questionCount
                                    }));
                                });
                            } else {
                                user.forEach((getUser) => {
                                    terminal("-->").green("***********");
                                    users.get(getUser.id).socket.send(JSON.stringify({
                                        "type": "waitingUsers",
                                        "users": user,
                                        "message": "Odanaya Katıldınız...",
                                    }));
                                });
                            }
                        }, 200);

                    }

                });
                terminal("\n").green("------>").red(rooms.length);

                break;
        }


    });
    socket.closed = false;

});