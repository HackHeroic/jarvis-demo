"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { listDocuments, deleteDocument, type IngestionDocument } from "@/lib/api";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<IngestionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listDocuments("demo");
      setDocuments(docs);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async (doc: IngestionDocument) => {
    if (!confirm(`Delete "${doc.file_name || doc.source_id}"? This will remove all chunks from ChromaDB and unlink from tasks.`)) {
      return;
    }
    setDeletingId(doc.source_id);
    try {
      await deleteDocument(doc.source_id, "demo");
      setDocuments((prev) => prev.filter((d) => d.source_id !== doc.source_id));
    } catch (err) {
      alert(`Failed to delete: ${err}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              All ingested documents stored in ChromaDB
            </p>
          </div>
          <Link
            href="/chat"
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition"
          >
            Upload via Chat
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-[var(--muted)]">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading documents...
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchDocs} className="text-sm text-[var(--accent)] hover:underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-20 text-[var(--muted)]">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg mb-2">No documents yet</p>
            <p className="text-sm mb-4">Upload a PDF or syllabus via the chat to get started.</p>
            <Link
              href="/chat"
              className="inline-block px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition"
            >
              Go to Chat
            </Link>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.source_id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:border-[var(--accent)]/30 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* File type icon */}
                    <div className="shrink-0 mt-0.5">
                      {doc.media_type === "pdf" ? (
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Title + type badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {doc.file_name || doc.source_id}
                        </h3>
                        {doc.media_type && (
                          <span className="shrink-0 text-[9px] font-mono bg-[var(--border)]/50 rounded px-1.5 py-0.5 text-[var(--muted)]">
                            {doc.media_type.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                        <span>{doc.chunk_count} chunks</span>
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.linked_task_ids.length > 0 && (
                          <span className="text-emerald-400">
                            Linked to {doc.linked_task_ids.length} task{doc.linked_task_ids.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Topic tags */}
                      {doc.document_topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.document_topics.map((topic) => (
                            <span
                              key={topic}
                              className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-full px-2 py-0.5"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.source_id}
                    className="shrink-0 p-2 rounded-lg text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-50"
                    title="Delete document"
                  >
                    {deletingId === doc.source_id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
