"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUpload from "@/components/chat/FileUpload";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
}

interface RoomUser {
  id: string;
  name: string;
  status: "online" | "away" | "busy";
}

interface ChatRoomProps {
  roomCode: string;
  currentUserId: string;
  currentUserName: string;
  messages: Message[];
  users: RoomUser[];
  typingUsers: string[];
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;         
  onTypingStop: () => void;  
  onLeave: () => void;
}

export default function ChatRoom({
  roomCode,
  currentUserId,
  messages,
  users,
  typingUsers,
  onSendMessage,
  onTypingStart,        
  onTypingStop, 
  onLeave,
}: ChatRoomProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); 

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (value: string) => {
  setInput(value);
  onTypingStart();

  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    onTypingStop();
  }, 1500);
};

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    onTypingStop(); 
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); 
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - user list */}
      <aside className="hidden w-56 shrink-0 border-r bg-muted/30 p-4 sm:block">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">Room Code</p>
          <p className="font-mono text-lg font-semibold">{roomCode}</p>
        </div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Users ({users.length})
        </p>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {u.name} {u.id === currentUserId && "(you)"}
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-6 w-full" onClick={onLeave}>
          Leave Room
        </Button>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-4 py-3 sm:hidden">
          <span className="font-mono font-semibold">{roomCode}</span>
          <Button variant="outline" size="sm" onClick={onLeave}>
            Leave
          </Button>
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) =>
            msg.type === "system" ? (
              <div key={msg.id} className="text-center text-xs text-muted-foreground">
                {msg.content}
              </div>
            ) : (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                    msg.senderId === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.senderId !== currentUserId && (
                    <p className="mb-0.5 text-xs font-medium opacity-70">{msg.sender}</p>
                  )}
                  <p>{msg.content}</p>
                </div>
              </div>
            )
          )}
          <div ref={bottomRef} />
          {typingUsers.length > 0 && (
  <p className="px-4 pb-1 text-xs text-muted-foreground">
    {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
  </p>
)}
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t p-3">
  <FileUpload
    onUploaded={(file) => {
      console.log("Uploaded:", file);
    }}
  />
  <Input
    placeholder="Type a message..."
    value={input}
    onChange={(e) => handleInputChange(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleSend()}
  />
  <Button onClick={handleSend}>Send</Button>
</div>
      </div>
    </div>
  );
}