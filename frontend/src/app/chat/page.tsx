"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { chatStream } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { Send, Loader2, MessageSquare, Sparkles, Bot, User } from "lucide-react";

const QUICK_PROMPTS = [
  "Analyze this job description for key requirements",
  "What skills am I missing for this role?",
  "Rewrite my summary to be more impactful",
  "Suggest projects I could add to strengthen my resume",
  "How can I quantify my achievements better?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [jd, setJd] = useState("");
  const [resumeContext, setResumeContext] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setShowContext(false);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      let accumulated = "";
      for await (const chunk of chatStream(
        newMessages,
        jd || undefined,
        resumeContext || undefined
      )) {
        accumulated += chunk;
        setMessages([
          ...newMessages,
          { role: "assistant", content: accumulated },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Career Coach</h1>
        <p className="text-muted-foreground">
          Get personalized resume advice, JD analysis, and career tips.
        </p>
      </div>

      {/* Context panel (collapsible) */}
      {showContext && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Context (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={3}
              placeholder="Paste a job description for targeted advice..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
            <Textarea
              rows={2}
              placeholder="Paste your resume text or key details..."
              value={resumeContext}
              onChange={(e) => setResumeContext(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold">How can I help?</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ask me about resume optimization, job descriptions, skill gaps, or
              career advice.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-secondary text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" &&
                streaming &&
                i === messages.length - 1 && (
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary" />
                )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        {!showContext && messages.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowContext(true)}
            title="Show context"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
        <Input
          className="flex-1"
          placeholder="Ask anything about your resume or career..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          disabled={streaming}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
        >
          {streaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
