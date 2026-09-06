"use client";
import { useState } from "react";
import LobbyView from "@/components/views/LobbyView";
import ChatRoom from "@/components/views/ChatRoom";
import ConnectingScreen from "@/components/ConnectingScreen";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSocket } from "@/hooks/useSocket";
import { getSocket } from "@/lib/socket"; 

export default function Home() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState("");
  const [userId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [isCreating, setIsCreating] = useState(false);

  const { messages, users, typingUsers, joinRoom, sendMessage, startTyping, stopTyping, leaveRoom } = useSocket();

  const handleCreateRoom = (name: string) => {
    setUserName(name);
    setIsCreating(true);

    const doCreate = () => {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      setCreatedRoomCode(code);
      joinRoom(code, name, userId);
      setIsCreating(false);
    };

      if (getSocket().connected) {
      doCreate();
    } else {
      getSocket().once("connect", doCreate);
      setTimeout(() => getSocket().off("connect", doCreate), 10000);
    }
    };

  const handleJoin = (code: string, name: string) => {
     const normalizedCode = code.trim().toUpperCase();
     const trimmedName = name.trim();

     if (!normalizedCode || !trimmedName) return;

     setUserName(trimmedName);
     setRoomCode(normalizedCode);
     joinRoom(normalizedCode, trimmedName, userId);
  };

  const handleEnterRoom = () => {
    if (createdRoomCode) setRoomCode(createdRoomCode);
  };

  const handleSendMessage = (
    content: string,
    file?: { url: string; name: string; size: number; mimeType: string }
  ) => {
    if (!roomCode) return;
    sendMessage(roomCode, content, userId, userName, file);
  };

  if (isCreating) {
    return <ConnectingScreen />;
  }

  if (!roomCode) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="container mx-auto max-w-2xl p-4 h-screen flex items-center justify-center">
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2 font-bold">
                <MessageCircle className="w-6 h-6" />
                SwiftNodeChat
              </CardTitle>
              <CardDescription>Instant chat rooms with real-time messaging</CardDescription>
            </CardHeader>
            <CardContent>
              <LobbyView
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoin}
                createdRoomCode={createdRoomCode}
                onEnterRoom={handleEnterRoom}
              />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <ChatRoom
      roomCode={roomCode}
      currentUserId={userId}
      currentUserName={userName}
      messages={messages}
      users={users}
      typingUsers={typingUsers.filter((n) => n !== userName)}
      onSendMessage={handleSendMessage}
      onTypingStart={() => startTyping(roomCode)}
      onTypingStop={() => stopTyping(roomCode)}
      onLeave={() => {
          leaveRoom(roomCode);
         setRoomCode(null);
      }}
    />
  );
}