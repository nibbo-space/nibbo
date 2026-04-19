import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

const MIME_BY_EXT = new Map<string, string>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

function projectRoot(): string {
  const fromEnv = process.env.PROJECT_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  const init = process.env.INIT_CWD?.trim();
  if (init) return path.resolve(init);
  return process.cwd();
}

function uploadRoot(): string {
  const raw = process.env.UPLOAD_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(projectRoot(), raw);
  }
  return path.resolve(projectRoot(), "uploads");
}

function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT.get(ext) || "application/octet-stream";
}

export function resolveUnderUploadRoot(relativePath: string): string | null {
  const rootResolved = path.resolve(uploadRoot());
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  if (segments.some((s) => s === "..")) return null;
  const full = path.resolve(rootResolved, ...segments);
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
  if (full === rootResolved || !full.startsWith(prefix)) return null;
  return full;
}

export async function saveUploadFile(relativePath: string, data: Buffer): Promise<void> {
  const full = resolveUnderUploadRoot(relativePath);
  if (!full) throw new Error("Invalid path");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readUploadFile(
  relativePath: string
): Promise<{ stream: ReadableStream; contentType: string } | null> {
  const full = resolveUnderUploadRoot(relativePath);
  if (!full) return null;
  try {
    const s = await stat(full);
    if (!s.isFile()) return null;
  } catch {
    return null;
  }
  const nodeStream = createReadStream(full);
  const stream = Readable.toWeb(nodeStream) as ReadableStream;
  return { stream, contentType: mimeFromFilename(full) };
}
