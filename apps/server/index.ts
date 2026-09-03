import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";

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
  typingUsers: Set<string>;  
  lastActive: number;
  createdAt: Date;
}

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  roomCode: { type: String, required: true, index: true },
  content: { type: String, default: "" },
  senderId: { type: String, required: true },
  sender: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ["text", "file", "image", "system"], default: "text" },
  file: { url: String, name: String, size: Number, mimeType: String },
});
messageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const roomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

roomSchema.index({ lastActive: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Message = mongoose.model("Message", messageSchema);
const Room = mongoose.model("Room", roomSchema);

async function saveMessageToDb(roomCode: string, message: {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
  file?: { url: string; name: string; size: number; mimeType: string };
}) {
  if (mongoose.connection.readyState !== 1) return; // DB connected nahi hai to skip
  try {
    await Message.create({ ...message, roomCode });
  } catch (error) {
    console.error("Error saving message:", error);
  }
}

async function getMessagesFromDb(roomCode: string) {
  if (mongoose.connection.readyState !== 1) return [];
  try {
    const messages = await Message.find({ roomCode })
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();
    return messages.map((m: any) => ({
      id: m.id,
      content: m.content || "",
      senderId: m.senderId,
      sender: m.sender,
      timestamp: m.timestamp,
      type: m.type,
      file: m.file?.url
        ? { url: m.file.url, name: m.file.name || "", size: m.file.size || 0, mimeType: m.file.mimeType || "" }
        : undefined,
    }));
  } catch (error) {
    console.error("Error loading messages:", error);
    return [];
  }
}

async function getOrCreateRoom(roomCode: string) {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await Room.findOneAndUpdate(
      { code: roomCode },
      { code: roomCode, lastActive: new Date() },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error saving room:", error);
  }
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

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn("Warning: MONGODB_URI not set. Messages won't persist.");
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

const rooms = new Map<string, RoomData>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

   // Join a room
 socket.on("join-room", async ({ roomId, name, userId }) => {
  const roomCode = roomId.toUpperCase();

  let room = rooms.get(roomCode);
  if (!room) {
    room = {
      id: roomCode,
      users: new Map<string, User>(),
      typingUsers: new Set<string>(), 
      lastActive: Date.now(),
      createdAt: new Date(),
    };
    rooms.set(roomCode, room);
    await getOrCreateRoom(roomCode);           
  }

  const messages = await getMessagesFromDb(roomCode);   

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

  socket.emit("joined-room", { roomCode, messages });   

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

socket.on("send-message", async ({ roomCode, message, userId, name }) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.lastActive = Date.now();
  room.typingUsers.delete(socket.id);
  io.to(roomCode).emit("typing-update", {
    typingUsers: Array.from(room.typingUsers).map(
      (id) => room.users.get(id)?.name || "Someone"
    ),
  });

  const messageData = {
    id: Math.random().toString(36).slice(2, 10),
    content: message,
    senderId: userId,
    sender: name,
    timestamp: new Date(),
    type: "text" as const,
  };

  await saveMessageToDb(roomCode, messageData);
  io.to(roomCode).emit("new-message", messageData);
});

socket.on("typing-start", ({ roomCode }) => {
  const room = rooms.get(roomCode);
  if (room && room.users.has(socket.id)) {
    room.typingUsers.add(socket.id);
    socket.to(roomCode).emit("typing-update", {
      typingUsers: Array.from(room.typingUsers).map(
        (id) => room.users.get(id)?.name || "Someone"
      ),
    });
  }
});

socket.on("typing-stop", ({ roomCode }) => {
  const room = rooms.get(roomCode);
  if (room) {
    room.typingUsers.delete(socket.id);
    socket.to(roomCode).emit("typing-update", {
      typingUsers: Array.from(room.typingUsers).map(
        (id) => room.users.get(id)?.name || "Someone"
      ),
    });
  }
});

 socket.on("disconnect", () => {
    for (const [roomCode, room] of rooms) {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        room.typingUsers.delete(socket.id);
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