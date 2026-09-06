"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onUploaded: (file: { url: string; name: string; size: number; mimeType: string }) => void;
}

export default function FileUpload({ onUploaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000"}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUploaded(data);
    } catch (err) {
      console.error("File upload error:", err);
      setError("File upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
       <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "..." : "📎"}
      </Button>
      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}
    </>
  );
}