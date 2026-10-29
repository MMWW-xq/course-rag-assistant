import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from "fs/promises";
import path from "path";

export async function ingestDocuments(source = "./documents", isSingleFile = false) {
  try {
    const absoluteSource = path.resolve(process.cwd(), source);
    let loader;

    if (isSingleFile) {
      const ext = path.extname(source).toLowerCase();
      if (ext === ".pdf") {
        loader = new PDFLoader(absoluteSource);
      } else if (ext === ".txt") {
        loader = new TextLoader(absoluteSource);
      } else {
        throw new Error(`Unsupported file extension: ${ext}`);
      }
    } else {
      throw new Error("Please upload a single file.");
    }

    const docs = await loader.load();
    if (docs.length === 0) return { success: false, message: "No docs found." };

    // 把文字切分成块
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splitDocs = await splitter.splitDocuments(docs);

    // 直接把所有文字拼接起来，存进一个 JSON 文件里
    const fullText = splitDocs.map(d => d.pageContent).join("\n\n");
    const dataFile = path.resolve(process.cwd(), "documents", "knowledge.json");
    await fs.writeFile(dataFile, JSON.stringify({ content: fullText }, null, 2));

    console.log(`✅ 成功提取文字，共 ${splitDocs.length} 段，已保存！`);
    return { success: true, chunks: splitDocs.length };
  } catch (error) {
    console.error("❌ 提取失败:", error);
    throw error;
  }
}