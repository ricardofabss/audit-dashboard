"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Send, Sparkles, RefreshCw, Trash2, MessageSquare, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useBusinessUnitStore, useActiveBU } from "@/hooks/use-business-unit";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

const PRESET_QUESTIONS = [
  "Berapa total anomali aktif saat ini dan mana yang paling kritis?",
  "Tunjukkan cabang/outlet dengan risiko paling tinggi.",
  "Rekomendasikan langkah audit mendadak (Sidak) untuk cabang berisiko.",
  "Jelaskan risiko pada sektor Otomotif dan Pergadaian.",
];

export function AIRiskCopilotDrawer() {
  const { language } = useTranslation();
  const activeBUId = useBusinessUnitStore((s) => s.activeBUId);
  const activeBU = useActiveBU();
  const validBUId = activeBU ? activeBU.id : null;

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const initialMessageText = activeBU
    ? `Halo! Saya AuditSphere AI Risk Copilot. Saat ini Anda berada di konteks **${activeBU.name} (${activeBU.code})**. Ada yang ingin Anda diskusikan mengenai risiko, anomali, atau rencana audit untuk unit ini?`
    : `Halo! Saya AuditSphere AI Risk Copilot. Saya siap membantu Anda menganalisis risiko dan anomali seluruh Business Unit secara real-time. Silakan pilih pertanyaan cepat atau ketik pertanyaan Anda.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: initialMessageText,
      timestamp: "Just now",
    },
  ]);

  // Update initial message when active BU changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].sender === "ai") {
      setMessages([
        {
          id: "1",
          sender: "ai",
          text: activeBU
            ? `Halo! Saya AuditSphere AI Risk Copilot. Saat ini Anda berada di konteks **${activeBU.name} (${activeBU.code})**. Ada yang ingin Anda diskusikan mengenai risiko, anomali, atau rencana audit untuk unit ini?`
            : `Halo! Saya AuditSphere AI Risk Copilot. Saya siap membantu Anda menganalisis risiko dan anomali seluruh Business Unit secara real-time. Silakan pilih pertanyaan cepat atau ketik pertanyaan Anda.`,
          timestamp: "Just now",
        },
      ]);
    }
  }, [activeBU]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, isOpen]);

  const handleClearChat = () => {
    setMessages([
      {
        id: String(Date.now()),
        sender: "ai",
        text: activeBU
          ? `Percakapan telah diperbarui. Konteks aktif: **${activeBU.name}**. Silakan tanyakan analisis risiko atau saran audit.`
          : `Percakapan telah diperbarui. Silakan tanyakan analisis risiko atau saran program audit.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isThinking) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuery("");
    setIsThinking(true);

    try {
      // Map messages for API format
      const formattedHistory = updatedMessages.map((m) => ({
        sender: m.sender,
        content: m.text,
      }));

      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedHistory,
          activeBUId: validBUId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to connect to AI Copilot API");
      }

      const data = await res.json();
      const aiReply = data.reply || "Maaf, AI tidak mengembalikan respon.";

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Copilot Chat error:", err);
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: `⚠️ Kendala koneksi AI: ${err.message || "Gagal menghubungi server AI"}. Silakan coba lagi.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-600 via-[#0b1739] to-indigo-600 px-4 py-3 text-white shadow-[0_0_30px_rgba(34,211,238,0.35)] backdrop-blur-xl group cursor-pointer"
      >
        <div className="relative">
          <Brain className="h-5 w-5 text-cyan-300 animate-pulse" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-900" />
        </div>
        <span className="text-xs font-bold tracking-wide">AI Risk Copilot</span>
        <Sparkles className="h-3.5 w-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
      </motion.button>

      {/* Copilot Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#091124]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col h-[560px]"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#0b1739] via-[#0e1d42] to-[#0f214d] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-inner">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>AuditSphere AI Copilot</span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                      ● Active Chat
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>Konteks:</span>
                    <strong className="text-cyan-300 font-medium">
                      {activeBU ? activeBU.shortName || activeBU.name : "All BUs (Consolidated)"}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChat}
                  title="Bersihkan Percakapan"
                  className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-semibold rounded-br-none shadow-md"
                        : "bg-white/[0.06] text-slate-200 border border-white/10 rounded-bl-none shadow-inner"
                    }`}
                  >
                    {msg.sender === "ai" ? (
                      <div className="space-y-1">
                        {msg.text.split("\n").map((line, idx) => {
                          const formattedLine = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                            j % 2 === 1 ? (
                              <strong key={j} className="font-bold text-cyan-300">{part}</strong>
                            ) : (
                              <span key={j}>{part}</span>
                            )
                          );
                          return (
                            <p key={idx} className={line.startsWith("-") ? "ml-2.5 my-0.5" : "my-0.5"}>
                              {formattedLine}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs italic bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2.5 w-fit animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>AI Copilot sedang berpikir & menganalisis data...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Preset Chips */}
            <div className="p-2 border-t border-white/5 bg-black/30 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  <span>Pertanyaan Cepat Copilot:</span>
                </span>
              </div>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto scrollbar-thin">
                {PRESET_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    disabled={isThinking}
                    className="text-left text-[10px] text-cyan-300 hover:text-white hover:bg-cyan-500/20 rounded-lg px-2.5 py-1.5 transition truncate border border-cyan-500/20 bg-cyan-500/[0.03] flex items-center justify-between group disabled:opacity-50"
                  >
                    <span className="truncate">💡 {q}</span>
                    <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-white/10 bg-[#060e20] flex items-center gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Tanyakan analisis AI dalam Bahasa Indonesia..."
                disabled={isThinking}
                className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!inputQuery.trim() || isThinking}
                size="icon"
                className="h-8.5 w-8.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shrink-0 font-bold shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
