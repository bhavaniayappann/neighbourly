import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_BATCH_SIZE = 100;

export function isEmbeddingsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function embedText(text: string): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const results = await embedTexts([trimmed]);
  return results?.[0] ?? null;
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const inputs = texts.map((t) => t.trim()).filter(Boolean);
  if (inputs.length === 0) return null;

  const client = new OpenAI({ apiKey });
  const embeddings: number[][] = [];

  for (let i = 0; i < inputs.length; i += MAX_BATCH_SIZE) {
    const batch = inputs.slice(i, i + MAX_BATCH_SIZE);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    embeddings.push(...ordered.map((row) => row.embedding));
  }

  return embeddings;
}
