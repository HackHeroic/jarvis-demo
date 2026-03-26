"use client";

import { useState, useCallback } from "react";
import { JarvisChatPanel } from "@/components/JarvisChatPanel";
import { SessionSidebar } from "@/components/SessionSidebar";
import { useJarvisChat } from "@/lib/useJarvisChat";

export default function ChatPage() {
  const chat = useJarvisChat();
  const { conversationId, startNewConversation, loadConversation } = chat;

  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFile = useCallback((file: File) => {
    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      setFileBase64(base64);
      setFileName(file.name);
      const ext = file.name.split(".").pop()?.toLowerCase();
      setMediaType(ext === "pdf" ? "pdf" : ext === "png" || ext === "jpeg" || ext === "jpg" ? "image" : "pdf");
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "application/pdf" || file.type.startsWith("image/"))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFileBase64(null);
    setMediaType(null);
    setFileName(null);
  }, []);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      await loadConversation(sessionId);
    },
    [loadConversation]
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex">
      {/* Sidebar */}
      <SessionSidebar
        currentSessionId={conversationId}
        onSelectSession={handleSelectSession}
        onNewConversation={startNewConversation}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-6 py-8">
        {/* File upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 mb-8 transition-colors ${
            isDragging ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:border-[var(--muted)]"
          }`}
        >
          <p className="text-center text-[var(--muted)] mb-4">
            Drop a syllabus or PDF directly into the chat
          </p>
          <div className="flex justify-center gap-4">
            <label className="cursor-pointer px-4 py-2 rounded bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)]/30 text-sm text-[var(--foreground)]">
              Choose file
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
            {fileBase64 && (
              <button
                onClick={clearFile}
                className="px-4 py-2 rounded bg-[var(--card-bg)] border border-[var(--border)] hover:bg-red-500/20 text-sm text-red-500"
              >
                Clear file
              </button>
            )}
          </div>

          {/* Processing spinner */}
          {isProcessingFile && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-[var(--accent)]">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing file...
            </div>
          )}

          {/* File attached indicator with type icon */}
          {fileBase64 && !isProcessingFile && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-[var(--accent)]">
              {mediaType === "pdf" ? (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <span className="font-medium">{fileName}</span>
              <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--card-bg)] rounded px-1.5 py-0.5 border border-[var(--border)]">
                {mediaType?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Chat panel — receives the shared hook instance */}
        <JarvisChatPanel
          fileBase64={fileBase64}
          mediaType={mediaType}
          fileName={fileName}
          onClearFile={clearFile}
          chat={chat}
        />
      </main>
    </div>
  );
}
