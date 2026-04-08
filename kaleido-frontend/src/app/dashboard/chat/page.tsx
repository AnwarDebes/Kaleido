"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Loader2,
  Bot,
  User,
  ChevronLeft,
} from "lucide-react";
import { api } from "@/lib/api";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag
          key={`list-${elements.length}`}
          className={listType === "ul" ? "list-disc pl-5 my-1" : "list-decimal pl-5 my-1"}
        >
          {listItems.map((li, i) => (
            <li key={i}>{formatInline(li)}</li>
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  }

  function formatInline(str: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={key++}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={key++}>{match[3]}</em>);
      } else if (match[4]) {
        parts.push(
          <code key={key++} className="rounded bg-amber-500/10 px-1 py-0.5 text-xs">
            {match[4]}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < str.length) {
      parts.push(str.slice(lastIndex));
    }
    return parts.length === 1 ? parts[0] : parts;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    const olMatch = line.match(/^\d+\.\s+(.*)/);

    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(ulMatch[1]);
    } else if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(olMatch[1]);
    } else {
      flushList();
      if (line.trim() === "") {
        elements.push(<br key={`br-${i}`} />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="my-1">
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();
  return elements;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(typeof window !== "undefined" ? window.innerWidth >= 640 : true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchConversations();
  }, []);

  async function fetchConversations() {
    setLoadingConvs(true);
    try {
      const res = await api.get("/chat/conversations?page=1&per_page=50");
      setConversations(res.data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingConvs(false);
    }
  }

  async function selectConversation(id: string) {
    setActiveConvId(id);
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversations/${id}/messages?page=1&per_page=100`);
      setMessages(res.data.data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function createConversation() {
    try {
      const res = await api.post("/chat/conversations", {});
      const conv = res.data.data;
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch {
      /* ignore */
    }
  }

  async function deleteConversation(id: string) {
    try {
      await api.delete(`/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch {
      /* ignore */
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeConvId || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.post(`/chat/conversations/${activeConvId}/messages`, { content });
      const data = res.data.data;
      // The API may return the assistant message or both messages
      if (Array.isArray(data)) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
          return [...withoutTemp, ...data];
        });
      } else {
        // Single assistant response
        setMessages((prev) => [...prev, data]);
      }
      // Update conversation title in sidebar
      fetchConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  }

  const inputClasses =
    "w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors";

  return (
    <div className="flex h-[calc(100vh-4rem)] sm:h-[calc(100vh-2rem)] gap-0 overflow-hidden rounded-2xl">
      {/* Conversation sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="glass-card flex flex-col overflow-hidden border-r border-card-border rounded-r-none shrink-0"
          >
            <div className="flex items-center justify-between p-4 border-b border-card-border">
              <h2 className="font-semibold text-sm">Conversations</h2>
              <button
                onClick={createConversation}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 p-2 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingConvs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted text-center py-8 px-4">
                  No conversations yet. Start a new chat.
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors group ${
                      activeConvId === conv.id
                        ? "bg-amber-500/15 text-amber-600"
                        : "hover:bg-amber-500/5 text-foreground/70"
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate flex-1">
                      {conv.title || "Untitled chat"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="glass-card flex flex-1 flex-col rounded-l-none overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="rounded-lg p-1.5 hover:bg-amber-500/10 transition-colors"
          >
            <ChevronLeft
              className={`h-5 w-5 transition-transform ${!showSidebar ? "rotate-180" : ""}`}
            />
          </button>
          <Bot className="h-5 w-5 text-amber-500" />
          <h1 className="font-semibold">AI Marketing Advisor</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConvId ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="rounded-full bg-amber-500/10 p-4">
                <MessageSquare className="h-10 w-10 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  Start a conversation with your AI marketing advisor
                </h2>
                <p className="text-sm text-muted max-w-md">
                  Get strategic advice, content ideas, campaign suggestions, and
                  marketing insights tailored to your brand.
                </p>
              </div>
              <button
                onClick={createConversation}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                New Chat
              </button>
            </div>
          ) : loadingMsgs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <Bot className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-muted">
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0 mt-1 h-7 w-7 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-amber-600" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-md"
                      : "glass-card rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 mt-1 h-7 w-7 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                )}
              </motion.div>
            ))
          )}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 mt-1 h-7 w-7 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Bot className="h-4 w-4 text-amber-600" />
              </div>
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeConvId && (
          <form onSubmit={sendMessage} className="p-4 border-t border-card-border">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your AI marketing advisor..."
                className={inputClasses + " flex-1"}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
