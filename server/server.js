import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use(cors({ origin: "*" }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  // options
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  // netUser joining notification
  // socket.on("notify-user-for-joining", (data) => {
  //   socket.broadcast.emit("got-new-user-joining-notification", data);
  // });

  // join a new user
  socket.on("join-user", (data) => {
    socket.join(data.id);
    socket.broadcast.emit("user-joined", data);
  });

  // handle new message
  socket.on("newMessage", (msg) => {
    socket.to(msg.receiverId).emit("receivedNewMsg", msg);
  });
});

httpServer.listen(7070, () => console.log("Running @http://localhost:7070"));
