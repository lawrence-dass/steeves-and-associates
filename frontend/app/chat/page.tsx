"use client";

import { useState, useRef, useEffect } from "react";
import { postApi, fetchApi } from "@/lib/api";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  sourceType?: string;
  sql?: string;
}

interface Suggestion {
  text: string;
  category: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApi<Suggestion[]>("/api/chat/suggestions")
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const result = await postApi<{
        response: string;
        intents: string[];
        sources_used: string[];
        source?: string;
        sql?: string;
      }>("/api/chat/message", {
        message: msg,
        session_id: "default",
        history: messages.slice(-6),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          sources: result.sources_used,
          sourceType: result.source,
          sql: result.sql,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble processing that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const sourceLabel = (s: string) => {
    const labels: Record<string, string> = {
      operational: "Operational Data",
      competitive: "Competitive Analysis",
      powerbi: "Power BI",
    };
    return labels[s] || s;
  };

  const sourceTypeLabel = (s?: string) => {
    const labels: Record<string, string> = {
      database: "Live Data Query",
      knowledge_base: "Contextual QA",
      direct: "General Response",
    };
    return s ? labels[s] || s : "";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] lg:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="vz-title">AI Chat Assistant</h1>
        <p className="vz-subtitle mt-1">
          Ask questions about operations, competitors, or Power BI dashboards
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto vz-card p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="mx-auto text-steeves-teal mb-3" size={32} />
            <p className="text-steeves-muted text-sm mb-6">
              Ask me anything about Steeves and Associates
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.text)}
                  className="text-xs px-3 py-2 rounded-full border border-steeves-border
                             text-steeves-muted hover:bg-steeves-blue hover:text-white
                             transition-colors text-left"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-steeves-navy flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-steeves-blue text-white"
                  : "bg-steeves-light text-steeves-ink border border-steeves-border"
              }`}
            >
              {msg.role === "assistant" && msg.sourceType && (
                <span className="inline-flex items-center rounded-full bg-steeves-blue/10 px-2 py-0.5 text-[10px] font-medium text-steeves-blue mb-2">
                  {sourceTypeLabel(msg.sourceType)}
                </span>
              )}

              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.sql && (
                <details className="mt-2 text-[11px] text-steeves-muted">
                  <summary className="cursor-pointer select-none">View SQL query</summary>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-[#f8f9fb] p-2 text-[11px] text-steeves-ink border border-steeves-border">
                    {msg.sql}
                  </pre>
                </details>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="flex gap-1 mt-2 pt-2 border-t border-steeves-border/80">
                  {msg.sources.map((s, j) => (
                    <span
                      key={j}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-steeves-teal/15 text-steeves-teal"
                    >
                      {sourceLabel(s)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-steeves-light flex items-center justify-center flex-shrink-0 mt-1 border border-steeves-border">
                <User size={14} className="text-steeves-muted" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-steeves-navy flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-steeves-light rounded-lg px-4 py-3 border border-steeves-border">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-steeves-muted/70 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-steeves-muted/70 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 bg-steeves-muted/70 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask about revenue, competitors, resources..."
          className="vz-input flex-1"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-steeves-navy text-white rounded-lg hover:bg-steeves-blue
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
