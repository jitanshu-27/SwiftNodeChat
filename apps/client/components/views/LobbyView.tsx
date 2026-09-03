"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LobbyViewProps {
  onJoin: (roomCode: string, name: string) => void;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function LobbyView({ onJoin }: LobbyViewProps) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (mode === "create") {
      const newCode = generateRoomCode();
      onJoin(newCode, name.trim());
    } else {
      if (!roomCode.trim()) return;
      onJoin(roomCode.trim().toUpperCase(), name.trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">SwiftNodeChat</h1>
          <p className="text-sm text-muted-foreground">
            Real-time chat rooms, no sign-up needed.
          </p>
        </div>

        <div className="flex gap-2 rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              mode === "create" ? "bg-background shadow" : "text-muted-foreground"
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
              mode === "join" ? "bg-background shadow" : "text-muted-foreground"
            }`}
          >
            Join Room
          </button>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {mode === "join" && (
            <Input
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          )}

          <Button onClick={handleSubmit} className="w-full">
            {mode === "create" ? "Create Room" : "Join Room"}
          </Button>
        </div>
      </div>
    </div>
  );
}