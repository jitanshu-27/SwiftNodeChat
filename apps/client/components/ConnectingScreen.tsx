"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ConnectingScreenProps {
  title?: string;
}

export default function ConnectingScreen({ title = "SwiftNodeChat" }: ConnectingScreenProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-muted blur-2xl scale-150 opacity-50" />
        <div className="relative h-32 w-32 rounded-full bg-muted flex items-center justify-center">
          <MessageCircle className="h-14 w-14" />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6">Connecting to server...</p>
      <div className="flex gap-1.5 mb-4">
        <span className="h-2 w-2 rounded-full bg-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-foreground animate-bounce" />
      </div>
      <p className="text-sm text-muted-foreground mb-2">{elapsed}s elapsed</p>
      <div className="w-64 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-foreground/40 animate-pulse w-1/2" />
      </div>
    </div>
  );
}