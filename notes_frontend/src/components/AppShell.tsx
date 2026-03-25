"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { api } from "@/lib/api/client";
import type { Note, NoteListItem } from "@/lib/api/types";
import { clearToken, getToken } from "@/lib/auth/tokenStorage";
import { navigate, parseRouteFromHash, type Route } from "@/lib/router/hashRouter";

type Loadable<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "ready"; data: T };

function useHotkey(handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

function useDebouncedCallback(cb: () => void, delayMs: number) {
  const timer = useRef<number | null>(null);
  return () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => cb(), delayMs);
  };
}

function formatUpdatedAt(updated_at?: string) {
  if (!updated_at) return "";
  try {
    const d = new Date(updated_at);
    return d.toLocaleString();
  } catch {
    return updated_at;
  }
}

function retroTitle(note?: Note) {
  return note?.title?.trim() ? note.title : "Untitled";
}

function AuthPanel({
  mode,
  onAuthed,
}: {
  mode: "login" | "signup";
  onAuthed: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<Loadable<null>>({ state: "idle" });

  async function submit() {
    setStatus({ state: "loading" });
    try {
      if (!email.includes("@")) throw new Error("Please enter a valid email.");
      if (password.length < 6)
        throw new Error("Password must be at least 6 characters.");
      if (mode === "login") await api.login({ email, password });
      else await api.signup({ email, password });
      setStatus({ state: "ready", data: null });
      onAuthed();
    } catch (e) {
      setStatus({
        state: "error",
        error: e instanceof Error ? e.message : "Authentication failed",
      });
    }
  }

  return (
    <section className="panel scanlines p-5">
      <h1 className="text-xl font-semibold">
        {mode === "login" ? "Log in" : "Sign up"}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Your notes are private per user. Sessions are stored locally in your
        browser.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-[color:var(--muted)]">Email</span>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-[color:var(--muted)]">Password</span>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </label>

        {status.state === "error" ? (
          <div className="card border border-red-500/40 bg-red-500/10 p-3 text-sm">
            {status.error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn"
            onClick={submit}
            disabled={status.state === "loading"}
          >
            {status.state === "loading"
              ? "Working…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
          <a
            className="btn secondary"
            href={mode === "login" ? "#/signup" : "#/login"}
          >
            {mode === "login"
              ? "Need an account?"
              : "Already have an account?"}
          </a>
          <a className="btn secondary" href="#/notes">
            Continue as guest
          </a>
        </div>

        <p className="text-xs text-[color:var(--muted)]">
          API base URL:{" "}
          <span className="kbd">{process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}</span>
        </p>
      </div>
    </section>
  );
}

function Sidebar({
  tags,
  activeTag,
  onSelectTag,
}: {
  tags: string[];
  activeTag?: string;
  onSelectTag: (tag?: string) => void;
}) {
  return (
    <aside className="panel scanlines p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Tags</div>
        <button className="btn secondary text-xs" onClick={() => onSelectTag()}>
          Clear
        </button>
      </div>
      <div className="hr my-3" />
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-[color:var(--muted)]">
            No tags yet.
          </span>
        ) : null}
        {tags.map((t) => (
          <button
            key={t}
            className={clsx("badge", activeTag === t && "active")}
            onClick={() => onSelectTag(t)}
          >
            #{t}
          </button>
        ))}
      </div>
    </aside>
  );
}

function NotesList({
  items,
  activeId,
  onSelect,
}: {
  items: NoteListItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel scanlines p-4">
      <div className="text-sm font-semibold">Notes</div>
      <div className="hr my-3" />
      <div className="grid gap-2">
        {items.length === 0 ? (
          <div className="text-sm text-[color:var(--muted)]">
            No notes match your filters.
          </div>
        ) : null}
        {items.map((n) => (
          <button
            key={n.id}
            className={clsx(
              "card p-3 text-left transition-colors",
              activeId === n.id
                ? "border-[rgba(6,182,212,0.5)] bg-[rgba(6,182,212,0.12)]"
                : "hover:bg-[rgba(231,236,255,0.06)]",
            )}
            onClick={() => onSelect(n.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">{n.title || "Untitled"}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {formatUpdatedAt(n.updated_at)}
              </div>
            </div>
            {n.excerpt ? (
              <div className="mt-1 text-xs text-[color:var(--muted)] line-clamp-2">
                {n.excerpt}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {(n.tags || []).slice(0, 6).map((t) => (
                <span key={t} className="badge">
                  #{t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function Editor({
  note,
  onChange,
  onDelete,
  saveState,
}: {
  note: Note;
  onChange: (next: Note) => void;
  onDelete: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  const [preview, setPreview] = useState(false);

  return (
    <section className="panel scanlines p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Editor</div>
          <span className="badge">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save error"
                  : "Idle"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn secondary text-sm" onClick={() => setPreview((p) => !p)}>
            {preview ? "Edit" : "Preview"}
          </button>
          <button className="btn secondary text-sm" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="hr my-3" />

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-[color:var(--muted)]">Title</span>
          <input
            className="input"
            value={note.title}
            onChange={(e) => onChange({ ...note, title: e.target.value })}
            placeholder="Untitled note"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-[color:var(--muted)]">
            Tags (comma separated)
          </span>
          <input
            className="input"
            value={(note.tags || []).join(", ")}
            onChange={(e) =>
              onChange({
                ...note,
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="work, ideas, todo"
          />
        </label>

        {preview ? (
          <article className="card p-4">
            <h2 className="text-lg font-semibold mb-2">{retroTitle(note)}</h2>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content || "_Nothing here yet._"}
            </ReactMarkdown>
          </article>
        ) : (
          <label className="grid gap-1">
            <span className="text-xs text-[color:var(--muted)]">
              Markdown
            </span>
            <textarea
              className="textarea min-h-[280px] font-mono text-sm"
              value={note.content}
              onChange={(e) => onChange({ ...note, content: e.target.value })}
              placeholder={"# Hello\n\nWrite *markdown* here…"}
            />
          </label>
        )}
      </div>
    </section>
  );
}

export default function AppShell() {
  const [route, setRoute] = useState<Route>({ name: "notes" });

  const [tags, setTags] = useState<Loadable<string[]>>({ state: "idle" });
  const [notes, setNotes] = useState<Loadable<NoteListItem[]>>({ state: "idle" });
  const [activeNote, setActiveNote] = useState<Loadable<Note>>({ state: "idle" });

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");



  useEffect(() => {
    const onHash = () => setRoute(parseRouteFromHash(window.location.hash));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useHotkey((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const el = document.getElementById("notes-search");
      if (el instanceof HTMLInputElement) el.focus();
    }
  });

  async function loadSidebar() {
    setTags({ state: "loading" });
    try {
      const data = await api.listTags();
      setTags({ state: "ready", data: data.tags || [] });
    } catch (e) {
      setTags({
        state: "error",
        error: e instanceof Error ? e.message : "Failed to load tags",
      });
    }
  }

  async function loadNotesList(params: { q?: string; tag?: string } = {}) {
    setNotes({ state: "loading" });
    try {
      const data = await api.listNotes(params);
      setNotes({ state: "ready", data: data.items || [] });
    } catch (e) {
      setNotes({
        state: "error",
        error: e instanceof Error ? e.message : "Failed to load notes",
      });
    }
  }

  async function openNote(id: string) {
    setActiveNote({ state: "loading" });
    try {
      const note = await api.getNote(id);
      setActiveNote({ state: "ready", data: note });
      navigate(`/notes/${id}`);
    } catch (e) {
      setActiveNote({
        state: "error",
        error: e instanceof Error ? e.message : "Failed to open note",
      });
    }
  }

  async function createNewNote() {
    setActiveNote({ state: "loading" });
    try {
      const note = await api.createNote({
        title: "New note",
        content: "",
        tags: [],
      });
      setActiveNote({ state: "ready", data: note });
      await loadNotesList({ q: query || undefined, tag: activeTag });
      navigate(`/notes/${note.id}`);
    } catch (e) {
      setActiveNote({
        state: "error",
        error: e instanceof Error ? e.message : "Failed to create note",
      });
    }
  }

  async function deleteActive() {
    if (activeNote.state !== "ready") return;
    const id = activeNote.data.id;
    if (!confirm("Delete this note?")) return;
    try {
      await api.deleteNote(id);
      setActiveNote({ state: "idle" });
      await loadNotesList({ q: query || undefined, tag: activeTag });
      await loadSidebar();
      navigate(`/notes`);
    } catch {
      // ignore
    }
  }

  const debouncedSave = useDebouncedCallback(async () => {
    if (activeNote.state !== "ready") return;
    try {
      setSaveState("saving");
      const n = activeNote.data;
      const saved = await api.updateNote(n.id, {
        title: n.title,
        content: n.content,
        tags: n.tags,
      });
      setActiveNote({ state: "ready", data: saved });
      setSaveState("saved");
      // Refresh sidebar + list in background
      loadNotesList({ q: query || undefined, tag: activeTag });
      loadSidebar();
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 2000);
    }
  }, 650);

  useEffect(() => {
    if (route.name === "notes") {
      loadSidebar();
      loadNotesList({ q: query || undefined, tag: activeTag });
      const noteId = route.noteId;
      if (noteId) openNote(noteId);
      else setActiveNote({ state: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // When filters change, refresh list
  useEffect(() => {
    if (route.name !== "notes") return;
    loadNotesList({ q: query || undefined, tag: activeTag });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTag]);

  const content =
    route.name === "login" ? (
      <AuthPanel
        mode="login"
        onAuthed={() => {
          loadSidebar();
          loadNotesList();
          navigate("/notes");
        }}
      />
    ) : route.name === "signup" ? (
      <AuthPanel
        mode="signup"
        onAuthed={() => {
          loadSidebar();
          loadNotesList();
          navigate("/notes");
        }}
      />
    ) : (
      <div className="grid gap-4 lg:grid-cols-[260px_340px_1fr]">
        <div className="grid gap-4">
          <Sidebar
            tags={tags.state === "ready" ? tags.data : []}
            activeTag={activeTag}
            onSelectTag={(t) => setActiveTag(t)}
          />

          <section className="panel scanlines p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Account</div>
              {getToken() ? (
                <button
                  className="btn secondary text-xs"
                  onClick={() => {
                    clearToken();
                    navigate("/login");
                  }}
                >
                  Log out
                </button>
              ) : (
                <a className="btn secondary text-xs" href="#/login">
                  Log in
                </a>
              )}
            </div>
            <div className="hr my-3" />
            <div className="text-xs text-[color:var(--muted)]">
              {getToken()
                ? "Authenticated mode enabled."
                : "Guest mode (API may reject writes)."}
            </div>
          </section>
        </div>

        <div className="grid gap-4">
          <section className="panel scanlines p-4">
            <div className="flex items-center justify-between gap-2">
              <label className="grid gap-1 w-full">
                <span className="text-xs text-[color:var(--muted)]">
                  Search <span className="kbd">Ctrl</span>+<span className="kbd">K</span>
                </span>
                <input
                  id="notes-search"
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title/content…"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn" onClick={createNewNote}>
                New note
              </button>
              {activeTag ? (
                <span className="badge active">Filtering: #{activeTag}</span>
              ) : (
                <span className="badge">All tags</span>
              )}
              {query ? <span className="badge active">Query: “{query}”</span> : null}
            </div>

            {notes.state === "error" ? (
              <div className="mt-3 card border border-red-500/40 bg-red-500/10 p-3 text-sm">
                {notes.error}
              </div>
            ) : null}
          </section>

          <NotesList
            items={notes.state === "ready" ? notes.data : []}
            activeId={route.noteId}
            onSelect={(id) => openNote(id)}
          />
        </div>

        <div className="grid gap-4">
          {activeNote.state === "idle" ? (
            <section className="panel scanlines p-6">
              <h2 className="text-lg font-semibold">Select a note</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Choose a note from the list, or create a new one.
              </p>
              <div className="mt-4 flex gap-2">
                <button className="btn" onClick={createNewNote}>
                  New note
                </button>
                <a className="btn secondary" href="#/login">
                  Log in
                </a>
              </div>
              <div className="mt-5 text-xs text-[color:var(--muted)]">
                Backend spec currently only exposes a health route; ensure backend implements
                <span className="kbd">/auth</span>, <span className="kbd">/notes</span>, <span className="kbd">/tags</span>.
              </div>
            </section>
          ) : activeNote.state === "loading" ? (
            <section className="panel scanlines p-6">Loading note…</section>
          ) : activeNote.state === "error" ? (
            <section className="panel scanlines p-6">
              <div className="card border border-red-500/40 bg-red-500/10 p-3 text-sm">
                {activeNote.error}
              </div>
            </section>
          ) : (
            <Editor
              note={activeNote.data}
              saveState={saveState}
              onDelete={deleteActive}
              onChange={(n) => {
                setActiveNote({ state: "ready", data: n });
                debouncedSave();
              }}
            />
          )}
        </div>
      </div>
    );

  return <div>{content}</div>;
}
