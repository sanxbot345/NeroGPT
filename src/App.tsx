import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import { Conversation, Message } from "./types";
import { PERSONALITIES } from "./data";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  auth, 
  getUserConversationsFromServer, 
  saveConversationToServer, 
  deleteConversationFromServer 
} from "./lib/firebase";
import LoginModal from "./components/LoginModal";

const LOCAL_STORAGE_KEY = "litebot_chats_conversations";
const LOCAL_STORAGE_ACTIVE_KEY = "litebot_chats_active_id";

const INITIAL_CONVERSATION: Conversation = {
  id: "default-welcome",
  title: "Obrolan Utama",
  createdAt: new Date().toISOString(),
  messages: [],
  personalityId: "asisten-umum"
};

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 1. Initial Load
  useEffect(() => {
    const savedChats = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY);

    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats) as Conversation[];
        if (parsed.length > 0) {
          setConversations(parsed);
          if (savedActiveId && parsed.some(c => c.id === savedActiveId)) {
            setActiveConversationId(savedActiveId);
          } else {
            setActiveConversationId(parsed[0].id);
          }
        } else {
          setConversations([INITIAL_CONVERSATION]);
          setActiveConversationId(INITIAL_CONVERSATION.id);
        }
      } catch (e) {
        console.error("Gagal memuat riwayat obrolan dari localStorage:", e);
        setConversations([INITIAL_CONVERSATION]);
        setActiveConversationId(INITIAL_CONVERSATION.id);
      }
    } else {
      setConversations([INITIAL_CONVERSATION]);
      setActiveConversationId(INITIAL_CONVERSATION.id);
    }
  }, []);

  // 2. Save on state changes
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, activeConversationId);
    }
  }, [activeConversationId]);

  // 3. Sync conversations with Firestore when logged in
  useEffect(() => {
    if (!currentUser) return;
    
    const syncWithServer = async () => {
      try {
        const serverChats = await getUserConversationsFromServer(currentUser.uid);
        if (serverChats && serverChats.length > 0) {
          // Sort conversations by createdAt descending
          const sorted = serverChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setConversations(sorted);
          if (activeConversationId && sorted.some(c => c.id === activeConversationId)) {
            // keep the active id
          } else {
            setActiveConversationId(sorted[0].id);
          }
        } else {
          // If Firestore is empty but we have existing local chats, upload them to Firestore!
          if (conversations.length > 0) {
            for (const chat of conversations) {
              await saveConversationToServer(currentUser.uid, chat);
            }
          }
        }
      } catch (err) {
        console.error("Gagal menyinkronkan data dengan Firestore:", err);
      }
    };
    
    syncWithServer();
  }, [currentUser]);

  // 4. Auto-save active conversation to Firestore when it changes
  useEffect(() => {
    if (!currentUser || !activeConversation) return;
    
    saveConversationToServer(currentUser.uid, activeConversation);
  }, [conversations, currentUser, activeConversationId]);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  ) || null;

  // Handlers
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewConversation = (personalityId: string) => {
    const selectedPersonality = PERSONALITIES.find(p => p.id === personalityId) || PERSONALITIES[0];
    const newChat: Conversation = {
      id: `chat-${Date.now()}`,
      title: `Obrolan ${selectedPersonality.name}`,
      createdAt: new Date().toISOString(),
      messages: [],
      personalityId: personalityId
    };

    setConversations((prev) => [newChat, ...prev]);
    setActiveConversationId(newChat.id);
    setMobileSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    if (currentUser) {
      deleteConversationFromServer(currentUser.uid, id);
    }
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      
      // If deleted active chat, auto-select another one or make default
      if (activeConversationId === id) {
        if (filtered.length > 0) {
          setActiveConversationId(filtered[0].id);
        } else {
          const fresh = { ...INITIAL_CONVERSATION, id: `chat-${Date.now()}` };
          setActiveConversationId(fresh.id);
          return [fresh];
        }
      }
      return filtered;
    });
  };

  const handleClearConversation = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, messages: [] } : c
      )
    );
  };

  const handleSendMessage = async (text: string, options?: { thinking?: boolean, search?: boolean, file?: File | null }) => {
    if (!activeConversationId || !activeConversation) return;

    let fileData = undefined;
    if (options?.file) {
      // Basic read to base64 if needed, omitted here since it might be complex
      // we'll mainly use options.search and options.thinking
    }

    // Create user message
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      text,
      timestamp: new Date().toISOString()
    };

    // Update conversation with user's message
    const updatedMessages = [...activeConversation.messages, userMsg];
    
    // Auto rename conversation title if it is default naming and empty
    let newTitle = activeConversation.title;
    if (activeConversation.messages.length === 0) {
      newTitle = text.slice(0, 24).trim() + (text.length > 24 ? "..." : "");
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, title: newTitle, messages: updatedMessages }
          : c
      )
    );

    setIsGenerating(true);

    try {
      const activePersonality = PERSONALITIES.find(p => p.id === activeConversation.personalityId) || PERSONALITIES[0];

      // Call our secure backend API route
      const response = await fetch("/api/chat?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: updatedMessages,
          systemInstruction: activePersonality.systemInstruction,
          search: options?.search,
          thinking: options?.thinking
        })
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menghubungi API AI.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";
      
      // Variable to track if we've received the first chunk to hide the loading dots
      let isFirstChunk = true;
      const modelMsgId = `msg-${Date.now()}-model`;
      let sources: any[] = [];

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") {
                 done = true;
                 break;
              }
              try {
                const data = JSON.parse(dataStr);
                
                if (data.error) {
                  throw new Error(data.error);
                }
                
                if (data.groundingChunks) {
                  sources = data.groundingChunks;
                }
                
                if (data.text || sources.length > 0) {
                  if (data.text) fullText += data.text;
                  
                  if (isFirstChunk) {
                    isFirstChunk = false;
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === activeConversationId
                          ? {
                              ...c,
                              messages: [
                                ...updatedMessages,
                                { id: modelMsgId, role: "model", text: fullText, timestamp: new Date().toISOString(), sources }
                              ]
                            }
                          : c
                      )
                    );
                  } else {
                    setConversations((prev) =>
                      prev.map((c) => {
                        if (c.id === activeConversationId) {
                          const msgs = [...c.messages];
                          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], text: fullText, sources: sources.length > 0 ? sources : msgs[msgs.length - 1].sources };
                          return { ...c, messages: msgs };
                        }
                        return c;
                      })
                    );
                  }
                }
              } catch (e) {
                // Ignore parse errors on chunks
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error communicating with AI:", error);
      
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: "model",
        text: `⚠️ **Gagal Mendapatkan Tanggapan**\n\nTerjadi kekeliruan saat menghubungi layanan kecerdasan buatan. Detail kesalahan:\n> *${error.message || "Network Error"}*\n\n**Solusi:**\n1. Pastikan Anda telah mengonfigurasi **GEMINI_API_KEY** dengan benar di panel **Settings > Secrets** di Google AI Studio.\n2. Pastikan server lokal Anda aktif dan tidak ada hambatan koneksi jaringan.`,
        timestamp: new Date().toISOString()
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...updatedMessages, errorMsg] }
            : c
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChangePersonality = (personalityId: string) => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          const p = PERSONALITIES.find((pers) => pers.id === personalityId) || PERSONALITIES[0];
          // Update title if it has a default name
          const selectedText = p.name;
          const isDefaultName = c.title.startsWith("Obrolan ") || c.title === "Obrolan Utama";
          const newTitle = isDefaultName ? `Obrolan ${selectedText}` : c.title;
          
          return {
            ...c,
            personalityId,
            title: newTitle
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] flex items-center justify-center font-sans antialiased text-neutral-800 sm:p-6 relative overflow-hidden">
      {/* Background radial glowing ambient light effects for desktop */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-indigo-950/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-emerald-950/15 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Elegant phone container mock */}
      <div className="w-full max-w-[420px] h-screen sm:h-[860px] sm:max-h-[92vh] sm:rounded-[48px] sm:border-[11px] sm:border-[#1e1e22] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] relative overflow-hidden bg-[#141414] flex flex-col transition-all duration-300 ring-1 ring-neutral-800/10">
        
        {/* Notch/Status indicators simulator on desktop */}
        <div className="hidden sm:flex items-center justify-between px-7 pt-3.5 pb-2.5 bg-[#0b0b0d] text-[10px] text-neutral-500 font-mono font-bold shrink-0 z-30 select-none border-b border-neutral-900/60 relative">
          <div className="flex items-center gap-1">
            <span>14:37</span>
            <i className="fa-solid fa-location-arrow text-[8px] text-indigo-400"></i>
          </div>
          {/* Ear piece notch */}
          <div className="w-24 h-4 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0 flex items-center justify-center border-x border-b border-[#1e1e22]/20 shadow-inner z-50">
            <div className="w-10 h-1 bg-neutral-800 rounded-full"></div>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-wifi"></i>
            <i className="fa-solid fa-signal"></i>
            <div className="flex items-center gap-0.5">
              <i className="fa-solid fa-battery-three-quarters text-emerald-500 text-[11px]"></i>
            </div>
          </div>
        </div>

        {/* Outer relative wrapper to correctly contain sidebar overlay scroll scope in mockup window */}
        <div className="flex flex-1 h-full w-full overflow-hidden relative">
          {/* Sidebar Component */}
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            isOpenOnMobile={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            user={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />

          {/* Main Chat Area */}
          <ChatArea
            conversation={activeConversation}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            isGenerating={isGenerating}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            onChangePersonality={handleChangePersonality}
          />

          {/* Login / Auth Overlay contained within phone bounds */}
          <LoginModal 
            isOpen={isLoginModalOpen} 
            onClose={() => setIsLoginModalOpen(false)} 
          />
        </div>
      </div>
    </div>
  );
}
