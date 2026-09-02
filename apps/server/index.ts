import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

interface User {
  id: string;
  socketId: string;
  name: string;
  status: "online" | "away" | "busy";
  joinedAt: Date;
}

interface RoomData {
  id: string;
  users: Map<string, User>;
  lastActive: number;
  createdAt: Date;
}

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms = new Map<string, RoomData>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

   // Join a room
  socket.on("join-room", ({ roomId, name, userId }) => {
    const roomCode = roomId.toUpperCase();

    let room = rooms.get(roomCode);
    if (!room) {
      room = {
        id: roomCode,
        users: new Map<string, User>(),
        lastActive: Date.now(),
        createdAt: new Date(),
      };
      rooms.set(roomCode, room);
    }

    const user: User = {
      id: userId || socket.id,
      socketId: socket.id,
      name: name || "Anonymous",
      status: "online",
      joinedAt: new Date(),
    };

    socket.join(roomCode);
    room.users.set(socket.id, user);
    room.lastActive = Date.now();

    socket.emit("joined-room", { roomCode });

    io.to(roomCode).emit("user-joined", {
      userCount: room.users.size,
      users: Array.from(room.users.values()).map((u) => ({
        id: u.id,
        name: u.name,
        status: u.status,
      })),
});

    console.log(`${user.name} joined room ${roomCode}`);
  });

 socket.on("disconnect", () => {
    for (const [roomCode, room] of rooms) {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        io.to(roomCode).emit("user-left", {
          userCount: room.users.size,
          users: Array.from(room.users.values()).map((u) => ({
            id: u.id,
            name: u.name,
            status: u.status,
          })),
        });
      }
    }
    console.log("User disconnected:", socket.id);
  });
});



const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`SwiftNodeChat server running on port ${PORT}`);
});