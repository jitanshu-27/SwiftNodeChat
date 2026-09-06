"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy } from "lucide-react";

interface LobbyViewProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  createdRoomCode?: string;
  onEnterRoom?: () => void; 
  isLoading?: boolean;
}

export default function LobbyView({
  onCreateRoom,
  onJoinRoom,
  createdRoomCode,
  onEnterRoom, 
  isLoading,
}: LobbyViewProps) {
  const [name, setName] = useState("");
  const [inputCode, setInputCode] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={() => onCreateRoom(name)}
        className="w-full text-lg py-6"
        size="lg"
        disabled={isLoading || !name.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating room...
          </>
        ) : (
          "Create New Room"
        )}
      </Button>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className="text-lg py-5"
      />

      <div className="flex gap-2">
        <Input
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          placeholder="Enter Room Code"
          className="text-lg py-5"
        />
        <Button
              type="button"
              onClick={() => onJoinRoom(inputCode, name)}
              size="lg"
              className="px-8"
              disabled={!name.trim() || !inputCode.trim()}
            >
            Join Room
        </Button>
      </div>

      {createdRoomCode && (
  <div className="text-center p-6 bg-muted rounded-lg space-y-3">
    <p className="text-sm text-muted-foreground mb-2">
      Share this code with your friend
    </p>
    <div className="flex items-center justify-center gap-2">
      <span className="font-mono text-2xl font-bold">{createdRoomCode}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => copyToClipboard(createdRoomCode)}
        className="h-8 w-8"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
    <Button type="button" onClick={onEnterRoom} className="w-full">
      Enter Room
    </Button>
  </div>
)}
    </div>
  );
}