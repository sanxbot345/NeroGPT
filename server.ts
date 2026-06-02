import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi di server. Silakan tambahkan kunci Anda di menu Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function getFriendlyGeminiError(error: any): string {
  const errMsg = error.message ? String(error.message) : String(error);
  if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Quota")) {
    return "💡 Batas kuota harian Gemini API Anda telah habis (429 Quota Exceeded).\n\nSilakan periksa detail penggunaan kuota atau tambahkan kartu metode pembayaran di panel paket Google AI Studio Anda, atau coba lagi beberapa saat lagi.";
  }
  if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("Invalid API key") || errMsg.includes("API key tidak valid")) {
    return "💡 Kunci API Gemini Anda tidak dapat dikenali atau tidak valid. Silakan periksa kembali di menu Settings > Secrets di Google AI Studio.";
  }
  return errMsg || "Gagal mendapatkan respons dari model AI karena kesalahan server.";
}

// Server-side chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, search, thinking } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Daftar pesan diperlukan (array)." });
    }

    // Check if user is asking "siapa kamu" or similar questions
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const cleanText = lastUserMessage.text.trim().toLowerCase().replace(/[?.,!]/g, "");
      const identityPhrases = [
        "siapa kamu",
        "kamu siapa",
        "siapa anda",
        "anda siapa",
        "who are you",
        "apa itu nerogpt",
        "siapakah kamu",
        "siapakah anda"
      ];
      if (identityPhrases.includes(cleanText)) {
        const responseText = "Aku adalah neroGPT yg di rancang untuk coding";
        if (req.query.stream === "true") {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();
          res.write(`data: ${JSON.stringify({ text: responseText })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } else {
          return res.json({
            role: "model",
            text: responseText,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const ai = getAiClient();

    // Convert frontend messages to @google/genai format, matching multimodal features
    const contents = messages.map((msg: any) => {
      const parts: any[] = [];
      
      // If there is an attachment, add the inlineData part first
      if (msg.attachment && msg.attachment.data && msg.attachment.mimeType) {
        parts.push({
          inlineData: {
            mimeType: msg.attachment.mimeType,
            data: msg.attachment.data
          }
        });
      }
      
      // Always add the text part
      parts.push({ text: msg.text || "" });
      
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    });

    const systemPrompt = (systemInstruction || 
      "Anda adalah asisten AI yang pintar, efisien, dan siap membantu pengguna dengan jawaban yang ringkas dan tepat. Hindari sapaan panjang. Format jawaban dengan markdown yang rapi.") + 
      "\n\nATURAN IDENTITAS UTAMA: Jika ada yang bertanya tentang siapa Anda (seperti 'siapa kamu', 'kamu siapa', 'siapa anda', 'who are you', dll), Anda wajib menjawab persis: 'Aku adalah neroGPT yg di rancang untuk coding'.";

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 8192,
    };
    
    // If thinking is enabled, switch to gemini-3.1-pro-preview as it natively supports thinking level parameters.
    // Otherwise use gemini-3.5-flash for general high performance tasks.
    let modelName = "gemini-3.5-flash"; 

    if (search) {
      config.tools = [{ googleSearch: {} }];
    }
    
    if (thinking) {
      modelName = "gemini-3.1-pro-preview";
      config.thinkingConfig = { thinkingLevel: 'HIGH' }; 
    }

    // Generate output
    if (req.query.stream === "true") {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config
      });
      
      for await (const chunk of responseStream) {
        const payload: any = { text: chunk.text || "" };
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          payload.groundingChunks = groundingChunks;
        }
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config
    });

    const replyText = response.text || "Maaf, tidak ada teks respons dari kecerdasan buatan.";

    return res.json({
      role: "model",
      text: replyText,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const friendlyMessage = getFriendlyGeminiError(error);
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
        res.end();
      } catch (e) {
        console.error("Gagal mengirim error ke stream:", e);
      }
      return;
    }
    return res.status(500).json({ 
      error: friendlyMessage
    });
  }
});

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
