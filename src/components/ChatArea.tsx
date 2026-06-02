import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { Conversation, Message, Personality } from "../types";
import { PERSONALITIES } from "../data";

// Helper component for smooth typing effect on generating messages
const SmoothMarkdown = ({ text, isGenerating, components }: { text: string, isGenerating: boolean, components: any }) => {
  const [displayedText, setDisplayedText] = useState(text);

  useEffect(() => {
    if (!isGenerating) {
      setDisplayedText(text);
      return;
    }

    if (displayedText.length >= text.length) {
      setDisplayedText(text);
      return;
    }

    const interval = setInterval(() => {
      setDisplayedText(prev => {
        if (prev.length < text.length) {
          const jump = Math.max(1, Math.ceil((text.length - prev.length) / 4));
          return text.substring(0, prev.length + jump);
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 20);

    return () => clearInterval(interval);
  }, [text, isGenerating]);

  return <Markdown components={components}>{isGenerating ? displayedText : text}</Markdown>;
};

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (text: string, options?: { thinking?: boolean, search?: boolean, file?: File | null }) => void;
  onClearConversation: () => void;
  isGenerating: boolean;
  onOpenMobileSidebar: () => void;
  onChangePersonality?: (personalityId: string) => void;
}

export default function ChatArea({
  conversation,
  onSendMessage,
  onClearConversation,
  isGenerating,
  onOpenMobileSidebar,
  onChangePersonality,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileClick = () => {
    setIsActionsMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleThinkingClick = () => {
    setIsThinkingEnabled(!isThinkingEnabled);
    setIsActionsMenuOpen(false);
  };

  const handleSearchClick = () => {
    setIsSearchEnabled(!isSearchEnabled);
    setIsActionsMenuOpen(false);
  };

  const activePersonality = PERSONALITIES.find(
    (p) => p.id === (conversation?.personalityId || "asisten-umum")
  ) || PERSONALITIES[0];

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isGenerating ? "auto" : "smooth" });
  }, [conversation?.messages, isGenerating]);

  // Monitor scroll for "back to bottom" button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Show button if user gets 400px above bottom
    const isFar = scrollHeight - scrollTop - clientHeight > 400;
    setShowScrollBottom(isFar);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim(), { thinking: isThinkingEnabled, search: isSearchEnabled, file: selectedFile });
    setInputText("");
    setIsThinkingEnabled(false);
    setIsSearchEnabled(false);
    setSelectedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1500);
  };

  const handleSuggestionClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  const getPersonalityBadgeColor = (pId: string) => {
    switch (pId) {
      case "asisten-umum":
        return "bg-amber-950/40 text-amber-300 border-amber-900/30";
      case "koding-mentor":
        return "bg-blue-950/40 text-blue-300 border-blue-900/30";
      case "pena-kreatif":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
      case "guru-bahasa":
        return "bg-indigo-950/40 text-indigo-300 border-indigo-900/30";
      default:
        return "bg-neutral-800/40 text-neutral-300 border-neutral-750";
    }
  };

  const getPersonalityInfoIcon = (pId: string, className = "w-5 h-5") => {
    const personality = PERSONALITIES.find(p => p.id === pId) || PERSONALITIES[0];
    return <img src={personality.image} alt={personality.name} className={`${className} object-cover rounded-full`} />;
  };

  const renderPreviews = () => {
    if (!selectedFile && !isThinkingEnabled && !isSearchEnabled) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-1 border-b border-transparent">
        {selectedFile && (
          <div className="flex items-center gap-2 bg-neutral-900 shadow-sm border border-neutral-800 px-3 py-1.5 rounded-xl text-sm text-neutral-300 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <i className="fa-solid fa-file text-blue-400"></i>
            <span className="font-medium truncate max-w-[150px]">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="ml-1 text-neutral-500 hover:text-neutral-300 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}
        
        {isThinkingEnabled && (
          <div className="flex items-center gap-2 bg-purple-950/40 text-purple-300 px-3 py-1.5 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-1 duration-200 border border-purple-900/40">
            <i className="fa-solid fa-brain"></i>
            <span>Berpikir</span>
            <button type="button" onClick={() => setIsThinkingEnabled(false)} className="ml-1 text-purple-500 hover:text-purple-300 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}
        
        {isSearchEnabled && (
          <div className="flex items-center gap-2 bg-emerald-950/40 text-emerald-300 px-3 py-1.5 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-1 duration-200 border border-emerald-900/40">
            <i className="fa-solid fa-globe"></i>
            <span>Search</span>
            <button type="button" onClick={() => setIsSearchEnabled(false)} className="ml-1 text-emerald-500 hover:text-emerald-300 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 bg-[#141414] relative">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            e.target.value = "";
          }
        }}
      />
      
      {/* Mobile Menu Bar - Sticky & Blurred */}
      <div className="sticky top-0 z-20 flex items-center p-3 bg-neutral-900/40 border-b border-neutral-800/80 shrink-0 shadow-sm" style={{ backdropFilter: 'blur(140px)', WebkitBackdropFilter: 'blur(140px)' }}>
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-neutral-400 hover:bg-neutral-800/50 transition-all flex items-center justify-center w-10 h-10 cursor-pointer shrink-0"
          title="Buka Menu"
        >
          <i className="fa-solid fa-bars text-lg"></i>
        </button>
        <div className="ml-3 flex items-center font-bold tracking-wide">
          <span className="relative flex h-2.5 w-2.5 mr-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xl text-neutral-100" style={{ fontFamily: '"Boldonse", "Bebas Neue", "Arial Black", sans-serif' }}>
            neroGPT
          </span>
        </div>
      </div>

      {/* Main Chat Containers */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin relative"
      >
        {!conversation || conversation.messages.length === 0 ? (
          /* Empty state / ChatGPT Style Welcome - Iconic & Minimalist */
          <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center p-4">
            <div className="w-20 h-20 bg-neutral-900 rounded-full overflow-hidden flex items-center justify-center shadow-md ring-1 ring-neutral-800 shadow-neutral-900/40 mb-6 transition-all hover:scale-105">
              <img src="/cobrax.jpg" referrerPolicy="no-referrer" alt="neroGPT Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl sm:text-[32px] font-medium text-neutral-100 tracking-tight text-center">
              Apa yang bisa saya bantu?
            </h2>
          </div>
        ) : (
          /* Message List */
          <div className="max-w-5xl mx-auto space-y-6">
            {conversation.messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLastMsg = idx === conversation.messages.length - 1;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Message Bubble container */}
                  <div className={`flex flex-col ${isUser ? "items-end max-w-[85%] sm:max-w-[75%]" : "items-start w-full"}`}>
                    <div
                      className={`relative px-4 py-3 rounded-2xl border ${
                        isUser
                           ? "bg-[#1c1c1e] text-white border-neutral-800 shadow-sm rounded-tr-none"
                           : "bg-[#18181a] text-neutral-100 border-neutral-800/90 shadow-[0_2px_12px_rgba(0,0,0,0.15)] rounded-tl-none w-full"
                      }`}
                    >
                      {isUser ? (
                        <div className="flex flex-col">
                          {msg.attachment && (
                            <div className="mb-2 max-w-xs sm:max-w-md rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/40">
                              {msg.attachment.mimeType.startsWith("image/") ? (
                                <img
                                  src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                                  alt={msg.attachment.name}
                                  className="max-h-48 w-auto object-contain mx-auto"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex items-center gap-2 p-2 bg-neutral-950/40 text-neutral-300 text-[11px]">
                                  <i className="fa-solid fa-file-invoice text-blue-400"></i>
                                  <span className="truncate max-w-[150px] font-mono">{msg.attachment.name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap select-none">
                            {msg.text}
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs leading-relaxed select-none markdown-container">
                          <SmoothMarkdown
                            text={msg.text}
                            isGenerating={isGenerating && isLastMsg && !isUser}
                            components={{
                              p: ({ children }: any) => (
                                <p className="mb-2.5 last:mb-0 leading-relaxed font-medium text-neutral-250/95">
                                  {children}
                                </p>
                              ),
                              code: ({ node, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || "");
                                const isInline = !match;
                                const codeString = String(children).replace(/\n$/, "");
                                const blockId = `code-block-${Math.random().toString(36).substring(2, 9)}`;

                                return isInline ? (
                                  <code
                                    className="bg-neutral-800/90 text-neutral-200 border border-neutral-750 px-1 py-0.5 rounded font-mono text-[11px] font-bold"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                ) : (
                                  <div className="relative my-3 rounded-xl overflow-hidden border border-neutral-800 shadow-sm">
                                    <div className="flex items-center justify-between px-4 py-1.5 bg-[#141416]/90 border-b border-neutral-800 text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                                      <div className="flex items-center gap-1.5">
                                        <i className="fa-solid fa-terminal text-[10px] text-neutral-500"></i>
                                        <span>{match ? match[1] : "code"}</span>
                                      </div>
                                      <button
                                        onClick={() => copyCode(codeString, blockId)}
                                        className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                                      >
                                        {copiedCodeId === blockId ? (
                                          <>
                                            <i className="fa-solid fa-check text-[10px] text-emerald-500"></i>
                                            <span>Tersalin!</span>
                                          </>
                                        ) : (
                                          <>
                                            <i className="fa-regular fa-copy text-[10px]"></i>
                                            <span>Salin</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="p-3 bg-neutral-950 overflow-x-auto text-[11px] text-neutral-200 font-mono leading-relaxed select-none">
                                      <code>{children}</code>
                                    </pre>
                                  </div>
                                );
                              },
                              ul: ({ children }) => (
                                <ul className="list-disc pl-5 mb-2.5 space-y-1.5 font-medium text-neutral-250/95">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal pl-5 mb-2.5 space-y-1.5 font-medium text-neutral-250/95">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-xs leading-relaxed">{children}</li>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-sm font-bold text-neutral-100 mt-4 mb-2 border-b border-neutral-805 pb-1">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-xs font-bold text-neutral-100 mt-3.5 mb-1.5">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-xs font-bold text-neutral-200 mt-2.5 mb-1">
                                  {children}
                                </h3>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-3 border-neutral-700 pl-3.5 py-0.5 italic my-2 text-neutral-400 bg-neutral-900/40 rounded-r">
                                  {children}
                                </blockquote>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-3 rounded-lg border border-neutral-800">
                                  <table className="w-full text-left border-collapse">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-[#121213] border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400">
                                  {children}
                                </thead>
                              ),
                              tbody: ({ children }) => (
                                <tbody className="divide-y divide-neutral-800">
                                  {children}
                                </tbody>
                              ),
                              tr: ({ children }) => <tr className="hover:bg-neutral-800/30">{children}</tr>,
                              th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
                              td: ({ children }) => <td className="px-3 py-1.5 text-xs text-neutral-400">{children}</td>,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Grounding / Search Sources */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                          <i className="fa-solid fa-layer-group text-blue-555"></i> Sumber Informasi
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src: any, idx) => {
                            if (!src.web?.uri && !src.web?.title) return null;
                            return (
                              <a
                                key={idx}
                                href={src.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center max-w-[200px] gap-1.5 px-2.5 py-1.5 bg-[#1a1a1c] border border-neutral-800 rounded-lg hover:border-blue-900/60 hover:bg-blue-955/20 transition-all shadow-sm"
                                title={src.web.title}
                              >
                                <img src={`https://www.google.com/s2/favicons?domain=${new URL(src.web.uri).hostname}&sz=32`} alt="favicon" className="w-3 h-3 rounded-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span className="text-[10px] font-medium text-neutral-300 truncate">{src.web.title}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Metadata: Timestamp & Copy Button */}
                    <div className="flex items-center gap-2 mt-2.5 px-1">
                      <span className="text-[9px] font-medium text-neutral-500 flex items-center gap-0.5">
                        <i className="fa-regular fa-clock text-[9px]"></i>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!isUser && (
                        <button
                          onClick={() => copyText(msg.text, msg.id)}
                          className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5 rounded cursor-pointer"
                          title="Salin semua jawaban"
                        >
                          {copiedId === msg.id ? (
                            <i className="fa-solid fa-check text-[10px] text-emerald-500"></i>
                          ) : (
                            <i className="fa-regular fa-copy text-[10px]"></i>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isGenerating && conversation.messages[conversation.messages.length - 1]?.role === "user" && (
              <div className="flex gap-4 justify-start">
                <div className="flex flex-col items-start w-full">
                  <div className="px-5 py-4 rounded-2xl bg-[#18181a] border border-neutral-800 shadow-sm rounded-tl-none flex items-center justify-center w-fit">
                    <span className="flex gap-1.5 items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-600 animate-bounce"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-600 animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-600 animate-bounce [animation-delay:0.4s]"></div>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Back to Bottom Quick Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#1a1a1c]/95 backdrop-blur-sm text-neutral-300 hover:text-white border border-neutral-800 shadow-[0_4px_16px_rgba(0,0,0,0.4)] rounded-full transition-all hover:scale-105 flex items-center justify-center cursor-pointer z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          title="Scroll ke bawah"
        >
          <i className="fa-solid fa-arrow-down text-[18px]"></i>
        </button>
      )}

      {/* Bottom Sticky Input Section - ALWAYS visible at the bottom of the container */}
      <footer className="p-4 shrink-0 z-10 bg-transparent relative">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="relative border border-neutral-800 focus-within:border-neutral-700 focus-within:ring-1 focus-within:ring-neutral-700/50 rounded-3xl bg-[#1e1e20] backdrop-blur-sm transition-all p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] focus-within:shadow-sm">
            {renderPreviews()}
            <div className="flex items-end pr-1 text-left">
              <div className="relative mb-1 ml-1 pr-1 self-end">
                <button
                  type="button"
                  onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-full transition-all flex items-center justify-center w-8 h-8 cursor-pointer"
                  title="Lebih banyak aksi"
                >
                  <i className={`fa-solid fa-plus text-lg transition-transform ${isActionsMenuOpen ? 'rotate-45' : ''}`}></i>
                </button>
                
                {isActionsMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-3 w-64 bg-[#1a1a1c] border border-neutral-800 rounded-2xl shadow-xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-col py-1.5">
                      <button type="button" onClick={handleFileClick} className="flex items-start gap-3 px-4 py-2.5 hover:bg-neutral-800/60 transition-colors w-full text-left cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-blue-950/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-900/30">
                          <i className="fa-solid fa-file-lines text-sm"></i>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-200">File</div>
                          <div className="text-[11px] text-neutral-400 font-medium leading-tight mt-0.5">Membuka file</div>
                        </div>
                      </button>
                      <button type="button" onClick={handleThinkingClick} className="flex items-start gap-3 px-4 py-2.5 hover:bg-neutral-800/60 transition-colors w-full text-left cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg ${isThinkingEnabled ? 'bg-purple-600 text-white shadow-inner shadow-black/20' : 'bg-purple-950/35 text-purple-400'} flex items-center justify-center shrink-0 mt-0.5 ring-1 ${isThinkingEnabled ? 'ring-purple-600' : 'ring-purple-900/30'}`}>
                          <i className="fa-solid fa-brain text-sm"></i>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-200">Berpikir</div>
                          <div className="text-[11px] text-neutral-400 font-medium leading-tight mt-0.5">Berpikir secara mendalam dan menyeluruh</div>
                        </div>
                      </button>
                      <button type="button" onClick={handleSearchClick} className="flex items-start gap-3 px-4 py-2.5 hover:bg-neutral-800/60 transition-colors w-full text-left cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg ${isSearchEnabled ? 'bg-emerald-600 text-white shadow-inner shadow-black/20' : 'bg-emerald-950/35 text-emerald-400'} flex items-center justify-center shrink-0 mt-0.5 ring-1 ${isSearchEnabled ? 'ring-emerald-600' : 'ring-emerald-900/30'}`}>
                          <i className="fa-solid fa-globe text-sm"></i>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-200">Search</div>
                          <div className="text-[11px] text-neutral-400 font-medium leading-tight mt-0.5">Mencari informasi dari browser</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={!conversation || conversation.messages.length === 0 ? "Kirim pesan untuk mulai obrolan..." : "Kirim pesan untuk membalas..."}
                rows={Math.min(6, inputText.split("\n").length || 1)}
                className="flex-1 pl-3 pt-2.5 pb-2.5 pr-2 text-sm font-medium text-neutral-100 placeholder-neutral-500 bg-transparent resize-none focus:outline-none scrollbar-none min-h-[44px]"
                autoFocus
              />

              {/* Submit button inline right - perfect 50% circular send button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  inputText.trim() && !isGenerating
                    ? "bg-white text-neutral-950 hover:bg-neutral-200 shadow-sm scale-105 cursor-pointer"
                    : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                }`}
                title="Kirim pesan"
              >
                <i className="fa-solid fa-arrow-up block text-sm"></i>
              </button>
            </div>
            
            {/* Info panel */}
            <div className="flex items-center justify-between px-4 pb-1.5 pt-0.5 pointer-events-none">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                <span>Model: <span className="text-neutral-400 font-bold">neroGPT 2.5 Beta</span></span>
                <span className="hidden sm:inline">• Shift+Enter untuk baris baru</span>
              </div>
            </div>
          </div>
        </form>
      </footer>
    </div>
  );
}
