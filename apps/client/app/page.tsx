"use client";
import { useState } from "react";
import LobbyView from "@/components/views/LobbyView";
import ChatRoom from "@/components/views/ChatRoom";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
}

export default function Home() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [messages, setMessages] = useState<Message[]>([]);

   const handleJoin = (code: string, name: string) => {
    setRoomCode(code);
    setUserName(name);
  };

  const handleSendMessage = (content: string) => {
    // Abhi ke liye local state mein add kar rahe hain, Step 8 mein socket se bhejenge
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 10),
        content,
        senderId: userId,
        sender: userName,
        timestamp: new Date(),
        type: "text",
      },
    ]);
  };
  if (!roomCode) {
    return <LobbyView onJoin={handleJoin} />;
  }

  return (
    <ChatRoom
      roomCode={roomCode}
      currentUserId={userId}
      currentUserName={userName}
      messages={messages}
      users={[{ id: userId, name: userName, status: "online" }]}
      onSendMessage={handleSendMessage}
      onLeave={() => setRoomCode(null)}
    />
  );

}