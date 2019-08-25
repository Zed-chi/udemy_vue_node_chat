const express = require("express");
const socket = require("socket.io");
const path = require("path");
const http = require("http");
const users = require("./users")();

const publicPath = path.join(__dirname, "../public");
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socket(server);

const message = (name, text, id) => {
    return {
        name,
        text,
        id
    };
}

app.use(express.static(publicPath));

io.on(
    "connection",
    (sock) => {
        console.dir("IO connection <-");

        sock.on("join", (user, cb) => {
            if (!user.name || !user.room) {
                return cb("Enter valid user data");
            } else {
                cb({userId: sock.id});
                sock.join(user.room);

                users.remove(sock.id);
                users.add(sock.id, user.name, user.room);

                io.to(user.room).emit("users:update", users.getUsersByRoom(user.room));
                sock.emit("message:new", message("admin", `welcome, ${user.name}`));
                sock.broadcast.to(user.room).emit("message:new", message("Admin", `${user.name} joined`));
                
            }
        });

        sock.on(
            "message:create",
            (data, cb) => {
                if (!data) {
                    cb("message cant be empty");
                } else {
                    const user = users.get(sock.id);
                    if (user) {
                        io.to(user.room).emit("message:new", message(data.name, data.text, data.id))
                    }
                    cb();
                }
                console.log(data.text);
            }
        );

        sock.on("disconnect", ()=>{
            const user = users.remove(sock.id);
            if (user) {
                io.to(user.room).emit(
                    "message:new", 
                    message("admin", `${user.name} left the chat`)
                );
                io.to(user.room).emit(
                    "users:update", 
                    users.getUsersByRoom(user.room)
                );
            }
        });
    }
);

server.listen(
    port,
    () => console.log(`Server has been started on ${port} port`)
);