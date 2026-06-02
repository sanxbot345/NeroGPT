import React, { useState } from "react";
import { Conversation, Personality } from "../types";
import { PERSONALITIES } from "../data";
import { User, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (personalityId: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  user: User | null;
  onOpenLogin: () => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpenOnMobile,
  onCloseMobile,
  user,
  onOpenLogin
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const visibleConversations = conversations.filter(c => c.messages && c.messages.length > 0);
  const filteredConversations = visibleConversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPersonalityInfo = (pId: string) => {
    return PERSONALITIES.find(p => p.id === pId) || PERSONALITIES[0];
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenOnMobile && (
        <div 
          id="sidebar-overlay"
          className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar-container"
        className={`absolute inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#0d0d0f]/95 border-r border-neutral-800/80 backdrop-blur-md transform transition-transform duration-300 ease-out ${
          isOpenOnMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header - Brand */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neutral-900 border border-neutral-800 rounded-xl shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              <img src="/cobrax.jpg" referrerPolicy="no-referrer" alt="neroGPT Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-neutral-200 tracking-tight">neroGPT</h1>
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest bg-neutral-800/60 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">Smart light</span>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800/60 transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Action: New Conversation */}
        <div className="p-4 shrink-0">
          <button
            onClick={() => {
              onNewConversation("asisten-umum");
              onCloseMobile();
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-xl shadow-sm transition-all cursor-pointer group"
          >
            <i className="fa-solid fa-plus text-sm"></i>
            <span className="text-sm font-bold">Obrolan Baru</span>
          </button>
        </div>

        {/* Chat History List */}
        {visibleConversations.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-neutral-800/50">
            <div className="px-4 pb-2">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-[10px] text-[13px] text-neutral-500"></i>
                <input
                  type="text"
                  placeholder="Cari percakapan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#171719] border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-700/80 focus:border-neutral-750 transition-all text-neutral-250 placeholder-neutral-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 scrollbar-thin">
              <div className="px-1 pb-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Riwayat Chat ({filteredConversations.length})
                </span>
              </div>

              {filteredConversations.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-6 px-2 text-center text-xs text-neutral-500 font-medium">
                   Tidak ditemukan pencarian.
                 </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.id === activeConversationId;
                  const pInfo = getPersonalityInfo(c.personalityId);
                  return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-[#161618] border border-neutral-800 shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                      : "hover:bg-neutral-800/45 border border-transparent"
                  }`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-sm bg-neutral-800/50 flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                    <i className="fa-regular fa-message text-[10px] text-neutral-400"></i>
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-bold text-neutral-300 truncate">
                      {c.title}
                    </p>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(c.id);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded bg-neutral-850 text-red-400 hover:bg-red-950/80 hover:text-red-300 transition-all shadow-sm"
                      title="Hapus"
                    >
                      <i className="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    )}

      {/* User Auth Profile section */}
      <div className="p-3.5 border-t border-neutral-800/50 bg-[#09090b]">
        {user ? (
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div id="user-avatar" className="w-8 h-8 rounded-full bg-neutral-850 border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {user.photoURL ? (
                  <img src={user.photoURL} referrerPolicy="no-referrer" alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 text-[10px] font-bold text-neutral-300">
                    {user.displayName ? user.displayName.slice(0, 1).toUpperCase() : user.email?.slice(0, 1).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-200 truncate">{user.displayName || "Pengguna neroGPT"}</p>
                <p className="text-[10px] text-neutral-500 truncate font-semibold">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-gradient-to-tr from-red-950/20 to-transparent rounded-lg transition-all cursor-pointer shrink-0 border border-transparent hover:border-red-900/40"
              title="Keluar / Logout"
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm group"
          >
            <i className="fa-solid fa-user-lock text-[10px] text-neutral-850 transition-transform group-hover:scale-105"></i>
            <span>Masuk / Daftar Akun</span>
          </button>
        )}
      </div>

      {/* Fixed Footer info */}
      <div className="p-4 border-t border-neutral-800/50 bg-[#070708] text-center shrink-0">
          <p className="text-[10px] text-neutral-500 font-semibold tracking-wide uppercase">Ditenagai oleh Gemini 2.5 AI</p>
          <div className="flex items-center justify-center gap-1 mt-1 text-[11px] text-neutral-400 font-medium">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Status Layanan Aktif</span>
          </div>
        </div>
      </aside>
    </>
  );
}
