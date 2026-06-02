import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
} from "firebase/auth";
import { auth, loginWithGoogle, syncUserProfile, isFirebaseConfigured } from "../lib/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Map Firebase errors to helpful Indonesian explanations
  const getFriendlyErrorMessage = (errCode: string) => {
    switch (errCode) {
      case "auth/invalid-email":
        return "Format alamat email tidak valid.";
      case "auth/user-disabled":
        return "Akun ini telah dinonaktifkan.";
      case "auth/user-not-found":
        return "Email belum terdaftar. Silakan daftar akun baru.";
      case "auth/wrong-password":
        return "Password yang Anda masukkan salah.";
      case "auth/email-already-in-use":
        return "Email sudah terdaftar. Silakan gunakan email lain atau masuk.";
      case "auth/weak-password":
        return "Password minimal harus terdiri dari 6 karakter.";
      case "auth/operation-not-allowed":
        return "Fitur masuk dengan email/password belum diaktifkan di Firebase Console.";
      case "auth/popup-closed-by-user":
        return "Jendela login ditutup sebelum proses selesai.";
      case "auth/unauthorized-domain":
        return "Firebase mendeteksi domain tidak terdaftar. Silakan daftarkan domain preview AI Studio ini di Google Firebase Console Anda.";
      default:
        return "Terjadi kesalahan. Silakan coba lagi beberapa saat lagi.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      setLoading(false);
      return;
    }

    if (isSignUp && !displayName.trim()) {
      setError("Nama lengkap wajib diisi untuk pendaftaran.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Register client
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, {
          displayName: displayName.trim()
        });
        await syncUserProfile(cred.user);
      } else {
        // Sign in client
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(cred.user);
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      {/* Container */}
      <div 
        className="relative w-full max-w-md bg-[#131315] border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Head */}
        <div className="text-center mt-2">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <img src="/cobrax.jpg" referrerPolicy="no-referrer" alt="neroGPT Logo" className="w-9 h-9 rounded-md object-cover" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">neroGPT Account</h2>
          <p className="text-xs text-neutral-400 mt-1">Masuk untuk menyimpan profil dan mengoptimalkan asisten coding Anda.</p>
        </div>


        {/* Toggle Custom Tabs */}
        <div className="flex bg-[#1c1c1f] p-1 rounded-xl border border-neutral-800/80">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isSignUp ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Masuk Account
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isSignUp ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Buat Akun Baru
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex flex-col gap-2 animate-shake">
            <div className="px-4 py-3 text-xs font-medium text-red-200 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-400 mt-0.5 font-bold"></i>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Nama Lengkap</label>
              <div className="relative">
                <i className="fa-regular fa-user absolute left-3 top-[13px] text-xs text-neutral-500"></i>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap Anda..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#18181a] border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-700/85 transition-all text-neutral-100 placeholder-neutral-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Alamat Email</label>
            <div className="relative">
              <i className="fa-regular fa-envelope absolute left-3 top-[13px] text-xs text-neutral-500"></i>
              <input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#18181a] border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-700/85 transition-all text-neutral-100 placeholder-neutral-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Kata Sandi (Min. 6 Karakter)</label>
            <div className="relative">
              <i className="fa-solid fa-key absolute left-3 top-[13px] text-xs text-neutral-500"></i>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#18181a] border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-700/85 transition-all text-neutral-100 placeholder-neutral-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 text-xs font-bold text-neutral-950 bg-white hover:bg-neutral-200 transition-all rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                <span>Memproses...</span>
              </>
            ) : (
              <span>{isSignUp ? "Daftar Sekarang" : "Masuk"}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-800/80"></div>
          </div>
          <span className="relative px-3 bg-[#131315] text-[10px] uppercase font-bold tracking-wider text-neutral-500">Atau masuk dengan</span>
        </div>

        {/* Third-party button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 text-xs font-bold text-neutral-250 bg-[#171719] border border-neutral-800 hover:bg-neutral-800/60 transition-all rounded-xl cursor-pointer flex items-center justify-center gap-2.5 shadow-inner"
        >
          <img src="https://www.google.com/s2/favicons?domain=google.com&sz=32" alt="Google icon" className="w-4 h-4 rounded-full" />
          <span>Masuk dengan Google</span>
        </button>

      </div>
    </div>
  );
}
