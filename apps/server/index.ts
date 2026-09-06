import "dotenv/config";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";


const GRACE_PERIOD_MS = 5000;
const ROOM_CLEANUP_INTERVAL_MS = 3600000;   
const ROOM_INACTIVE_TIMEOUT_MS = 3600000;

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

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env");
}

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI!);

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
}

connectMongoDB();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "text/plain",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const isImage = req.file.mimetype.startsWith("image/");
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: isImage ? "image" : "raw",
          folder: "swiftnodechat",
        },
        (err, result) => (err ? reject(err) : resolve(result as { secure_url: string }))
      );
      stream.end(req.file!.buffer);
    });

    res.json({
      url: result.secure_url,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
});


const rooms = new Map<string, RoomData>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

   // Join a room
 socket.on("join-room", async ({ roomId, name, userId }) => {
 if (!roomId) {
    socket.emit("error", { message: "Room ID is required" });
    return;
  }
  const roomCode = roomId.toUpperCase().trim();
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
    let oldSocketId: string | undefined;
  for (const [socketId, u] of room.users) {
    if (u.id === (userId || socket.id)) {
      oldSocketId = socketId;
      break;
    }
  }
  const isReconnecting = !!oldSocketId;

  const messages = await getMessagesFromDb(roomCode);   

  const user: User = {
    id: userId || socket.id,
    socketId: socket.id,
    name: name || "Anonymous",
    status: "online",
    joinedAt: new Date(),
  };

  socket.join(roomCode);
  if (oldSocketId) room.users.delete(oldSocketId); 
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

  console.log(`${user.name} ${isReconnecting ? "reconnected to" : "joined"} room ${roomCode}`);
});

socket.on("leave-room", ({ roomCode }) => {
  const room = rooms.get(roomCode);

  if (!room) return;

  const user = room.users.get(socket.id);

  if (!user) return;

  room.users.delete(socket.id);
  room.typingUsers.delete(socket.id);

  socket.leave(roomCode);

  io.to(roomCode).emit("user-left", {
    userCount: room.users.size,
    users: Array.from(room.users.values()).map((u) => ({
      id: u.id,
      name: u.name,
      status: u.status,
    })),
  });

  console.log(`${user.name} left room ${roomCode}`);
});

socket.on("send-message", async ({ roomCode, message, userId, name , file}) => {
  const room = rooms.get(roomCode);
  if (!room || !room.users.has(socket.id)) return;  
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
    type: file  ? (file.mimeType?.startsWith("image/") ? ("image" as const) : ("file" as const))  : ("text" as const), file,
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
    const user = room.users.get(socket.id);
    if (!user) continue;

    const userId = user.id;

    room.typingUsers.delete(socket.id);
    socket.to(roomCode).emit("typing-update", {
      typingUsers: Array.from(room.typingUsers).map(
        (id) => room.users.get(id)?.name || "Someone"
      ),
    });

    setTimeout(() => {
      const currentRoom = rooms.get(roomCode);
      if (!currentRoom) return;

      
      const stillHasOldSocket = currentRoom.users.get(socket.id) === user;
      const hasReconnected = Array.from(currentRoom.users.values()).some(
        (u) => u.id === userId
      );

      if (stillHasOldSocket && !hasReconnected) {
        currentRoom.users.delete(socket.id);

        io.to(roomCode).emit("user-left", {
          userCount: currentRoom.users.size,
          users: Array.from(currentRoom.users.values()).map((u) => ({
            id: u.id,
            name: u.name,
            status: u.status,
          })),
        });

        console.log(`${user.name} left room ${roomCode} (grace period expired)`);
      } else {
        console.log(`${user.name} reconnected to room ${roomCode}, skipping removal`);
      }
    }, GRACE_PERIOD_MS);
  }
  console.log("User disconnected:", socket.id);
});
});

setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomCode) => {
    if (room.users.size === 0 && now - room.lastActive > ROOM_INACTIVE_TIMEOUT_MS) {
      console.log(`Cleaning up inactive room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  });
}, ROOM_CLEANUP_INTERVAL_MS);



const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`SwiftNodeChat server running on port ${PORT}`);
});