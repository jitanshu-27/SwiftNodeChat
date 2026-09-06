"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileUpload from "@/components/chat/FileUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Users, LogOut, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface MessageFile {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: string;
  timestamp: Date;
  type: "text" | "file" | "image" | "system";
  file?: MessageFile;
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
  onSendMessage: (content: string, file?: MessageFile) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onLeave: () => void;
}

export default function ChatRoom({
  roomCode,
  currentUserId,
  currentUserName,
  messages,
  users,
  typingUsers,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onLeave,
}: ChatRoomProps) {
  const [input, setInput] = useState("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Cleanup typing timeout when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle input changes + typing indicator
  const handleInputChange = (value: string) => {
    setInput(value);

    // If input is empty, stop typing
    if (!value.trim()) {
      onTypingStop();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      return;
    }

    // User is typing
    onTypingStart();

    // Reset previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1.5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop();
      typingTimeoutRef.current = null;
    }, 1500);
  };

  // Send text message
  const handleSend = () => {
    const message = input.trim();

    if (!message) return;

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Send message
    onSendMessage(message);

    // Clear input
    setInput("");

    // Stop typing indicator
    onTypingStop();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file upload
  const handleFileUploaded = (file: MessageFile) => {
    onSendMessage(file.name, file);
  };

  // Copy room code
  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch (error) {
      console.error("Failed to copy room code:", error);
    }
  };

  return (
    <>
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Chat Container */}
      <div className="container mx-auto flex h-screen max-w-2xl items-center justify-center p-4">
        <Card className="w-full">
          {/* Header */}
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <MessageCircle className="h-6 w-6" />
              SwiftNodeChat
            </CardTitle>

            <CardDescription>
              Instant chat rooms with real-time messaging
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Room Bar */}
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              {/* Room Code */}
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  Room:{" "}
                  <span className="font-mono font-bold">{roomCode}</span>
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyRoomCode}
                  title="Copy room code"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Users + Current User + Leave */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {users.length}
                </span>

                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background"
                  title={currentUserName}
                >
                  {currentUserName[0]?.toUpperCase() || "U"}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onLeave}
                  className="gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  Leave
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto space-y-3 rounded-lg border p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  // System message
                  if (msg.type === "system") {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  const isCurrentUser =
                    msg.senderId === currentUserId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isCurrentUser
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      {/* Sender Name */}
                      {!isCurrentUser && (
                        <span className="mb-0.5 text-xs text-muted-foreground">
                          {msg.sender}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {/* Image Message */}
                        {msg.type === "image" && msg.file ? (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage(msg.file!.url)
                            }
                            className="block"
                            title="Click to view image"
                          >
                            <img
                              src={msg.file.url}
                              alt={msg.file.name}
                              className="max-h-[220px] max-w-[220px] cursor-zoom-in rounded-md object-cover"
                            />
                          </button>
                        ) : msg.type === "file" && msg.file ? (
                          /* File Message */
                          <a
                            href={msg.file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 underline hover:opacity-80"
                          >
                            <span>📎</span>
                            <span className="break-all">
                              {msg.file.name}
                            </span>
                          </a>
                        ) : (
                          /* Text Message */
                          <p className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing...
                </p>
              )}

              {/* Auto Scroll Target */}
              <div ref={bottomRef} />
            </div>

            {/* Input Row */}
            <div className="flex gap-2">
              {/* File Upload */}
              <FileUpload onUploaded={handleFileUploaded} />

              {/* Message Input */}
              <Input
                placeholder="Type a message..."
                value={input}
                onChange={(e) =>
                  handleInputChange(e.target.value)
                }
                onKeyDown={handleKeyDown}
              />

              {/* Send Button */}
              <Button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedImage(null)}
        >
          {/* Zoomed Image */}
          <img
            src={zoomedImage}
            alt="Zoomed image"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-xl text-white hover:bg-white/20"
            aria-label="Close image"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}