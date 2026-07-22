"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  body: string;
  isAnonymous: boolean;
  mine: boolean;
  author: string;
  meta: string | null;
  createdAt: string;
};

type PublicChatProps = {
  initialMessages?: ChatMessage[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export default function PublicChat({ initialMessages = [] }: PublicChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingMessagesRef = useRef<Map<number, ChatMessage>>(new Map());

  function mergePendingMessages(serverMessages: ChatMessage[]) {
    const pendingMessages = [...pendingMessagesRef.current.values()];
    if (pendingMessages.length === 0) return serverMessages;
    return [...serverMessages, ...pendingMessages];
  }

  async function loadMessages({ silent = false } = {}) {
    try {
      const res = await fetch("/api/chat/messages", { cache: "no-store" });
      if (!res.ok) throw new Error("글을 불러오지 못했습니다.");
      const data = await res.json();
      setMessages(mergePendingMessages(data.messages ?? []));
      if (!silent) setError("");
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "글을 불러오지 못했습니다.");
      }
    }
  }

  useEffect(() => {
    if (initialMessages.length === 0) loadMessages();
    const timer = window.setInterval(() => loadMessages({ silent: true }), 2000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    const optimisticId = -(Date.now() + Math.floor(Math.random() * 1000));
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      body: trimmed,
      isAnonymous: true,
      mine: true,
      author: "익명",
      meta: null,
      createdAt: new Date().toISOString(),
    };
    pendingMessagesRef.current.set(optimisticId, optimisticMessage);
    setError("");
    setBody("");
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "글을 보내지 못했습니다.");
      }
      pendingMessagesRef.current.delete(optimisticId);
      setMessages((prev) =>
        [
          ...prev.filter(
            (message) => message.id !== optimisticId && message.id !== data.message.id
          ),
          data.message,
        ]
      );
    } catch (err) {
      pendingMessagesRef.current.delete(optimisticId);
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setBody(trimmed);
      setError(err instanceof Error ? err.message : "글을 보내지 못했습니다.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <section className="card flex h-full max-h-full min-h-[500px] w-full min-w-0 flex-col overflow-hidden xl:min-h-0">
      <div className="px-4 py-3.5">
        <h2 className="text-sm font-semibold text-ink">익명 대나무숲</h2>
      </div>

      <div
        ref={listRef}
        className="soft-scrollbar flex min-h-0 flex-1 flex-col-reverse gap-2.5 overscroll-contain overflow-y-auto px-3.5 py-3.5"
      >
        {messages.length ? (
          <>
            {[...messages].reverse().map((message) => (
              <article
                key={message.id}
                className={`flex items-end gap-1.5 ${
                  message.mine ? "justify-end" : "justify-start"
                }`}
              >
                {message.mine && (
                  <time className="shrink-0 pb-1 text-[11px] tabular-nums text-ink-3">
                    {formatTime(message.createdAt)}
                  </time>
                )}
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2.5 ${
                    message.mine
                      ? "rounded-br-md bg-brand text-white"
                      : "rounded-bl-md bg-page text-ink"
                  }`}
                >
                  <p
                    className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                      message.mine ? "text-white" : "text-ink-2"
                    }`}
                  >
                    {message.body}
                  </p>
                </div>
                {!message.mine && (
                  <time className="shrink-0 pb-1 text-[11px] tabular-nums text-ink-3">
                    {formatTime(message.createdAt)}
                  </time>
                )}
              </article>
            ))}
          </>
        ) : (
          <div className="flex min-h-full flex-col-reverse items-center justify-center text-center text-sm leading-6 text-ink-3">
            아직 글이 없습니다.
            <br />
            첫 글을 남겨보세요.
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={sendMessage} className="bg-white px-3.5 py-3">
        {error && <p className="mb-2 text-xs font-semibold text-brand">{error}</p>}
        <div className="relative">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="글 입력"
            className="soft-scrollbar block w-full resize-none rounded-xl border border-hairline bg-white px-3 py-2 pr-14 text-sm leading-6 text-ink outline-none transition focus:border-brand"
          />
          <button
            type="submit"
            disabled={!body.trim()}
            aria-label="전송"
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
            >
              <path
                d="M4.5 11.5 19.5 4l-4.75 16-3.45-6.25L4.5 11.5Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="m11.3 13.75 3.2-3.95"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
