import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import {
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI
} from "@langchain/google-genai";

export function getEmbeddings() {
    const provider = process.env.LLM_PROVIDER || "openai";

    if (provider === "ollama") {
        return new OllamaEmbeddings({
            baseUrl: "http://localhost:11434",
            model: "nomic-embed-text"
        });
    }

    if (provider === "gemini") {
        return new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "gemini-embedding-001"
        });
    }

    return new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://open.bigmodel.cn/api/paas/v4/", 
       model: "embedding-2"
    });
}

export function getLLM() {
    const provider = process.env.LLM_PROVIDER || "openai";

    if (provider === "ollama") {
        return new ChatOllama({
            baseUrl: "http://localhost:11434",
            model: "llama3"
        });
    }

    if (provider === "gemini") {
        return new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "gemini-3-flash-preview",
            maxOutputTokens: 2048
        });
    }

    return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://open.bigmodel.cn/api/paas/v4/",
        modelName: "glm-4-flash",
        temperature: 0
    });
}
