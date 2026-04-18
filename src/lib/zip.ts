import AdmZip from "adm-zip";
import path from "path";
import { putObject, guessMime } from "./storage";

/**
 * 解压 zip 文件到存储层（本地或 R2）
 * 返回：入口文件相对路径、文件数、总字节数
 */
export async function extractZipToStorage(
  zipBuffer: Buffer,
  slug: string,
  preferredEntry: string = "index.html"
): Promise<{ entryFile: string; fileCount: number; sizeBytes: number }> {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // 过滤掉目录、mac 元数据、隐藏文件
  const files = entries.filter(e => {
    if (e.isDirectory) return false;
    if (e.entryName.startsWith("__MACOSX/")) return false;
    if (e.entryName.endsWith("/.DS_Store") || e.entryName === ".DS_Store") return false;
    if (e.entryName.includes("/.DS_Store")) return false;
    return true;
  });

  if (files.length === 0) {
    throw new Error("压缩包内没有可用文件");
  }

  // 检测是否有统一的顶级目录（如 "项目名/"），若所有文件都在同一个一级目录下则剥掉
  const topDirs = new Set(files.map(f => f.entryName.split("/")[0]));
  let stripPrefix = "";
  if (topDirs.size === 1) {
    const only = [...topDirs][0];
    // 要求至少有一个文件在二级路径，即 only/xxx
    const allNested = files.every(f => f.entryName.startsWith(only + "/"));
    if (allNested) stripPrefix = only + "/";
  }

  let sizeBytes = 0;
  let detectedEntry: string | null = null;
  const entryCandidates = [preferredEntry, "index.html", "index.htm", "main.html", "home.html"];

  for (const entry of files) {
    const relativePath = entry.entryName.slice(stripPrefix.length);
    if (!relativePath) continue;

    const buf = entry.getData();
    sizeBytes += buf.length;
    const key = `prototypes/${slug}/${relativePath}`;
    const ext = path.extname(relativePath);
    await putObject(key, buf, guessMime(ext));

    // 记录潜在入口
    if (!detectedEntry) {
      for (const cand of entryCandidates) {
        if (relativePath.toLowerCase() === cand.toLowerCase() ||
            relativePath.toLowerCase() === cand.toLowerCase().replace(/^\//, "")) {
          detectedEntry = relativePath;
          break;
        }
      }
    }
  }

  // 兜底：找第一个 html 文件
  if (!detectedEntry) {
    const htmlFile = files
      .map(e => e.entryName.slice(stripPrefix.length))
      .filter(p => p && /\.html?$/i.test(p))
      .sort((a, b) => a.length - b.length)[0];
    if (htmlFile) detectedEntry = htmlFile;
  }

  if (!detectedEntry) {
    throw new Error("压缩包内未找到 HTML 入口文件");
  }

  return {
    entryFile: detectedEntry,
    fileCount: files.length,
    sizeBytes,
  };
}
