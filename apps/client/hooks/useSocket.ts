"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
  file?: { url: string; name: string; size: number; mimeType: string }; 
}

interface RoomUser {
  id: string;
  name: string;
  status: "online" | "away" | "busy";
}

export function useSocket() {
  const socketRef = useRef(getSocket());
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("joined-room", ({ messages: history }) => {
      setMessages(history || []);
    });

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user-joined", ({ users: userList }) => {
      setUsers(userList || []);
    });

    socket.on("user-left", ({ users: userList }) => {
      setUsers(userList || []);
    });

    socket.on("typing-update", ({ typingUsers: names }) => {
      setTypingUsers(names || []);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("joined-room");
      socket.off("new-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("typing-update");
    };
  }, []);

  const joinRoom = useCallback((roomId: string, name: string, userId: string) => {
    socketRef.current.emit("join-room", { roomId, name, userId });
  }, []);
  
  const leaveRoom = useCallback((roomCode: string) => {
  socketRef.current.emit("leave-room", { roomCode });
}, []);

  const sendMessage = useCallback(( roomCode: string, message: string, userId: string, name: string, file?: { url: string; name: string; size: number; mimeType: string }) => {
    socketRef.current.emit("send-message", { roomCode, message, userId, name, file });
  },[]
  )

  const startTyping = useCallback((roomCode: string) => {
    socketRef.current.emit("typing-start", { roomCode });
  }, []);

  const stopTyping = useCallback((roomCode: string) => {
    socketRef.current.emit("typing-stop", { roomCode });
  }, []);

  return {
    connected,
    messages,
    users,
    typingUsers,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
  };
}