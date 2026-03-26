"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/lib/themeContext";
import { cn } from "@/lib/utils";

const MERMAID_LIVE_URL = "https://mermaid.live/edit";

interface MermaidDiagramProps {
  id: string;
  mermaid: string;
  title?: string;
  description?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export function MermaidDiagram({
  id,
  mermaid: mermaidCode,
  title,
  description,
  className,
  defaultExpanded = false,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  const renderDiagram = useCallback(async () => {
    try {
      const mermaidModule = await import("mermaid");
      const mermaidLib = mermaidModule.default;
      mermaidLib.initialize({
        startOnLoad: false,
        theme: theme === "dark" ? "dark" : "default",
        securityLevel: "loose",
        flowchart: { useMaxWidth: true },
      });
      const uniqueId = `mermaid-${id}-${Date.now()}`;
      const { svg: rendered } = await mermaidLib.render(uniqueId, mermaidCode.trim());
      setSvg(rendered);
      setError(null);
    } catch (e) {
      setError(String(e));
      setSvg(null);
    }
  }, [id, mermaidCode, theme]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  const handleCopyToMermaidLive = useCallback(() => {
    const code = mermaidCode.trim();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
    window.open(MERMAID_LIVE_URL, "_blank", "noopener,noreferrer");
  }, [mermaidCode]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFullscreenWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(Math.max(z + delta, 0.25), 4));
    },
    []
  );

  const handleFullscreenMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleFullscreenMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: dragStart.current.panX + e.clientX - dragStart.current.x,
        y: dragStart.current.panY + e.clientY - dragStart.current.y,
      });
    },
    [isDragging]
  );

  const handleFullscreenMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isFullscreen) return;
    window.addEventListener("mousemove", handleFullscreenMouseMove);
    window.addEventListener("mouseup", handleFullscreenMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleFullscreenMouseMove);
      window.removeEventListener("mouseup", handleFullscreenMouseUp);
    };
  }, [isFullscreen, handleFullscreenMouseMove, handleFullscreenMouseUp]);

  const openFullscreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, closeFullscreen]);

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[var(--border)] bg-[var(--card-bg)]/80 p-6",
          className
        )}
      >
        <p className="text-sm text-red-500">Could not render diagram: {error}</p>
        <button
          type="button"
          onClick={handleCopyToMermaidLive}
          className="mt-2 text-sm text-[var(--accent)] hover:underline"
        >
          Copy code & open Mermaid Live
        </button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-[var(--border)] bg-[var(--card-bg)]/80 overflow-hidden", className)}>
      {(title || description) && (
        <div className="px-4 py-3 border-b border-[var(--border)]">
          {title && <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>}
          {description && <p className="text-sm text-[var(--muted)] mt-0.5">{description}</p>}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-[var(--border)]/50 bg-[var(--background)]/30">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-colors"
            title="Zoom out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M8 11h6" />
            </svg>
          </button>
          <span className="text-xs text-[var(--muted)] min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-colors"
            title="Zoom in"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M11 8v6" />
              <path d="M8 11h6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-colors text-xs"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            title="Expand to full screen — pan and zoom with trackpad"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M8 21H3v-6" />
              <path d="M21 10 3 21" />
            </svg>
            Expand
          </button>
          <button
            type="button"
            onClick={handleCopyToMermaidLive}
            className="px-2 py-1 rounded-md text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          >
            {copied ? "Copied!" : "Copy code & open Mermaid Live"}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="overflow-auto p-4 flex items-center justify-center min-h-[200px]"
        style={{ backgroundColor: "var(--background)" }}
      >
        {!svg ? (
          <div className="animate-pulse text-[var(--muted)]">Loading diagram...</div>
        ) : (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.2s ease",
            }}
            className="mermaid-container [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
      {isFullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Diagram fullscreen view"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--card-bg)]/95 border-b border-[var(--border)] shrink-0">
              <span className="text-sm text-[var(--muted)]">
                Drag to pan • Scroll or pinch to zoom • Press Esc to close
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-3 py-1.5 rounded-md text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={closeFullscreen}
                  className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/50 transition-colors"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
              onWheel={handleFullscreenWheel}
              onMouseDown={handleFullscreenMouseDown}
              style={{ touchAction: "none" }}
            >
              {svg && (
                <div
                  className="inline-block select-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
