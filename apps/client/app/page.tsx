"use client";
import { useState } from "react";
import LobbyView from "@/components/views/LobbyView";
import ChatRoom from "@/components/views/ChatRoom";
import { useSocket } from "@/hooks/useSocket";

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
  

   const { messages, users, joinRoom, sendMessage } = useSocket();

  const handleJoin = (code: string, name: string) => {
    setRoomCode(code);
    setUserName(name);
    joinRoom(code, name, userId);
}

const handleSendMessage = (content: string) => {
    if (!roomCode) return;
    sendMessage(roomCode, content, userId, userName);
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
      users={users}
      onSendMessage={handleSendMessage}
      onLeave={() => setRoomCode(null)}
    />
  );
}