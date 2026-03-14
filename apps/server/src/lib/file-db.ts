import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { genreRules } from "@ai-music/config";
import type { AccountInfo, LibrarySnapshot } from "@ai-music/types";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, "../../data");
const dbPath = path.join(dataDir, "db.json");

const defaultAccount: AccountInfo = {
  provider: "sunoapi",
  mode: "mock",
  creditsRemaining: 0,
  callbackConfigured: true,
  lastCheckedAt: null
};

const defaultSnapshot: LibrarySnapshot = {
  account: defaultAccount,
  songs: [],
  tasks: [],
  documents: [],
  rules: genreRules
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(defaultSnapshot, null, 2), "utf8");
  }
}

export async function readSnapshot() {
  await ensureDb();
  const content = await readFile(dbPath, "utf8");
  const parsed = JSON.parse(content) as LibrarySnapshot;

  return {
    ...defaultSnapshot,
    ...parsed,
    rules: genreRules,
    account: {
      ...defaultAccount,
      ...parsed.account
    }
  } satisfies LibrarySnapshot;
}

export async function writeSnapshot(next: LibrarySnapshot) {
  await ensureDb();
  await writeFile(dbPath, JSON.stringify(next, null, 2), "utf8");
}

export async function updateSnapshot(
  mutator: (snapshot: LibrarySnapshot) => LibrarySnapshot | Promise<LibrarySnapshot>
) {
  const current = await readSnapshot();
  const next = await mutator(current);
  await writeSnapshot(next);
  return next;
}

