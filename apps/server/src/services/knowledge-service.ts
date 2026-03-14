import { clamp, hashToken, makeId } from "../lib/utils.js";

const VECTOR_SIZE = 96;

function isCjk(char: string) {
  return /[\u3400-\u9fff]/u.test(char);
}

export function tokenize(text: string) {
  const trimmed = text.toLowerCase().trim();
  const latinTokens = trimmed
    .split(/[^a-z0-9\u3400-\u9fff]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
  const cjkTerms = Array.from(trimmed)
    .filter(isCjk)
    .flatMap((char, index, source) => {
      if (index >= source.length - 1 || !isCjk(source[index + 1] ?? "")) {
        return [char];
      }

      return [char, `${char}${source[index + 1]}`];
    });

  return [...latinTokens, ...cjkTerms].slice(0, 500);
}

export function vectorize(text: string) {
  const vector = new Array<number>(VECTOR_SIZE).fill(0);

  for (const token of tokenize(text)) {
    const hash = hashToken(token);
    const index = Number.parseInt(hash.slice(0, 4), 16) % VECTOR_SIZE;
    vector[index] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let sum = 0;

  for (let index = 0; index < length; index += 1) {
    sum += (a[index] ?? 0) * (b[index] ?? 0);
  }

  return clamp(sum, 0, 1);
}

export function buildChunks(documentId: string, text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const chunks = [];

  for (let index = 0; index < paragraphs.length; index += 3) {
    const slice = paragraphs.slice(index, index + 3);
    const chunkText = slice.join("\n\n");
    chunks.push({
      id: makeId("chunk"),
      documentId,
      label: `片段 ${index + 1}-${Math.min(index + 3, paragraphs.length)}`,
      text: chunkText,
      tokens: tokenize(chunkText),
      vector: vectorize(chunkText)
    });
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      id: makeId("chunk"),
      documentId,
      label: "片段 1",
      text: text.trim(),
      tokens: tokenize(text),
      vector: vectorize(text)
    });
  }

  return chunks;
}

export function extractKeywords(text: string, limit = 8) {
  const frequency = new Map<string, number>();

  for (const token of tokenize(text)) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  return [...frequency.entries()]
    .filter(([token]) => token.length >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([token]) => token);
}

export function summarizeText(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return "暂无摘要，等待导入正文。";
  }

  const selected = [paragraphs[0], paragraphs[Math.floor(paragraphs.length / 2)], paragraphs.at(-1)]
    .filter(Boolean)
    .join(" ");

  return selected.slice(0, 220);
}

export function retrieveRelevant(texts: Array<{ text: string; vector: number[] }>, query: string, limit = 3) {
  const queryVector = vectorize(query);

  return texts
    .map((entry) => ({
      ...entry,
      score: cosineSimilarity(entry.vector, queryVector)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

