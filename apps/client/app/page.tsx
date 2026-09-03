"use client";

import LobbyView from "@/components/views/LobbyView";

export default function Home() {
  const handleJoin = (roomCode: string, name: string) => {
    console.log("Joining:", roomCode, name);
    // Step 7 mein yahan se ChatRoom pe navigate karenge
  };

  return <LobbyView onJoin={handleJoin} />;
}