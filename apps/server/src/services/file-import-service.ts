import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const supportedFileTypes = new Set([".txt", ".md", ".docx", ".pdf"]);
const serviceDir = path.dirname(fileURLToPath(import.meta.url));

function resolveScriptPath() {
  const candidates = [
    path.resolve(serviceDir, "../../../scripts/extract_novel_text.py"),
    path.resolve(serviceDir, "../../../../scripts/extract_novel_text.py"),
    path.resolve(process.cwd(), "scripts/extract_novel_text.py"),
    path.resolve(process.cwd(), "../../scripts/extract_novel_text.py")
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("extract_novel_text.py not found");
  }

  return found;
}

async function runExtractor(scriptPath: string, filePath: string) {
  const commands: Array<{ command: string; args: string[] }> = [
    {
      command: "uv",
      args: ["run", "--with", "python-docx", "--with", "pypdf", "python", scriptPath, filePath]
    },
    {
      command: "python",
      args: [scriptPath, filePath]
    }
  ];

  let lastError: unknown;

  for (const entry of commands) {
    try {
      return await execFileAsync(entry.command, entry.args, {
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function extractNovelTextFromUpload(params: {
  filename: string;
  buffer: Buffer;
}) {
  const extension = path.extname(params.filename).toLowerCase();

  if (!supportedFileTypes.has(extension)) {
    throw new Error("Unsupported file type. Use txt, md, docx, or pdf.");
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-music-"));
  const filePath = path.join(tempDir, params.filename);
  const scriptPath = resolveScriptPath();

  try {
    await writeFile(filePath, params.buffer);
    const { stdout, stderr } = await runExtractor(scriptPath, filePath);

    if (stderr?.trim()) {
      throw new Error(stderr.trim());
    }

    return JSON.parse(stdout) as {
      title: string;
      text: string;
      extension: string;
      size: number;
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
