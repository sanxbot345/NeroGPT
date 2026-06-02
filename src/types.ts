export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  sources?: any[];
  attachment?: {
    mimeType: string;
    data: string; // base64 encoded
    name: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
  personalityId: string;
}

export interface Personality {
  id: string;
  name: string;
  image: string;
  description: string;
  systemInstruction: string;
  examplePrompts: string[];
}
