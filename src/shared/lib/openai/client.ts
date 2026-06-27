import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to .env.local (see .env.example).",
    );
  }

  cachedClient ??= new OpenAI({ apiKey });
  return cachedClient;
}
