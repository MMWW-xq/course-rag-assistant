"use client";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
/**
 * Main Chat Interface Component.
 * Features:
 * - Real-time chat with RAG backend
 * - Document upload and ingestion
 * - Modern, responsive UI with Tailwind CSS
 */
const formatMath = (text) => {
  if (!text) return "";
  let clean = text;
  // 1. 处理不规范的反斜杠括号
  clean = clean.split('\\[').join('$$$$');
  clean = clean.split('\\]').join('$$$$');
  clean = clean.split('\\(').join('$');
  clean = clean.split('\\)').join('$');
  
    // 2. 使用最基础的方法替换未包裹的偏导数，绝对不报错
  clean = clean.split('fxx').join('$f_{xx}$');
  clean = clean.split('fxy').join('$f_{xy}$');
  clean = clean.split('fyy').join('$f_{yy}$');
  clean = clean.split('fx').join('$f_{x}$');
  clean = clean.split('fy').join('$f_{y}$');
  
  return clean;
};
export default function Home() {
    const [messages, setMessages] = useState([
        {
            role: "bot",
            content: "学弟/学妹你好呀~ 我是你的专属贴心学姐。不管是晦涩难懂的学生手册，还是让人头秃的复习资料，都可以传给我，学姐来帮你整理~",
        },
    ]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    /**
     * Auto-scroll to the bottom of the chat when new messages arrive.
     */
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    /**
     * Handle sending a query to the chat API.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const currentQuery = query;
        setQuery("");
        setLoading(true);

        // Optimistically add user message
        setMessages((prev) => [
            ...prev,
            { role: "user", content: currentQuery },
        ]);

            try {
            // 组装历史记录（只取 user 和 bot 的内容，格式化给智谱）
      const historyMessages = messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }));
      
      // 加上当前最新的问题
      const requestMessages = [...historyMessages, { role: "user", content: currentQuery }];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages }), // 改为传数组
      });

      if (!res.ok) throw new Error("Network response was not ok");

      // 先塞入一个空的 AI 气泡，准备接收文字
      setMessages((prev) => [...prev, { role: "bot", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          // 实时更新最后那个 AI 气泡里的文字
                  setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullText;
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages((prev) => [...prev, { role: "bot", content: "抱歉，网络开小差了。" }]);
    } finally {
      setLoading(false);
    }
  };  

    /**
     * Handle file selection and upload to the ingestion API.
     */
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                // Success feedback
                setIsUploadModalOpen(false);
                setMessages((prev) => [
                    ...prev,
                    { role: "bot", content: `✅ I have processed the document: **${file.name}**. You can now ask questions about it.` },
                ]);
            } else {
                alert("Error uploading file: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Upload Error:", err);
            alert("Failed to upload file. Please try again.");
        } finally {
            setUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
                 {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 h-16 flex items-center justify-between px-4">
        {/* 左侧 Logo 和 标题区域 */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent hidden sm:block">
              🌸 阅微
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 hidden sm:block">见微知著 · 你的校园认知与知识重构空间</p>
          </div>
        </div>

        {/* 右侧 按钮 */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Upload Document"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          投喂资料给学姐
        </button>
      </header>

            {/* Main Chat Area */}
            <main className="flex-1 overflow-y-auto pt-24 pb-64 px-4 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <div className="max-w-3xl mx-auto space-y-8">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-4 animate-fade-in ${msg.role === "user" ? "flex-row-reverse" : ""
                                }`}
                        >
                            {/* Avatar */}
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user"
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                    }`}
                            >
                                {msg.role === "user" ? (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div
                                className={`group relative max-w-[85%] px-5 py-3 rounded-2xl shadow-sm leading-relaxed text-sm sm:text-base ${msg.role === "user"
                                        ? "bg-indigo-600 text-white rounded-tr-none"
                                        : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
                                    }`}
                            >
                                            <div className="bg-transparent break-words text-sm leading-relaxed overflow-x-auto">
                  {/* @ts-ignore */}
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
                  >
                    {formatMath(msg.content)}
                  </ReactMarkdown>
                </div>
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {loading && (
                        <div className="flex items-start gap-4 animate-fade-in">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                                <svg
                                    className="w-5 h-5 animate-spin"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-2xl rounded-tl-none text-zinc-400 text-sm">
                                Reasoning...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 pt-20 pb-8 z-40 pointer-events-none">
                <div className="max-w-3xl mx-auto px-4 pointer-events-auto">
                                                      {/* 快捷指令按钮组 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {["📝 提炼3个核心考点", "🔍 这个文件有什么限制条款？", "💡 出两道题考考我"].map((text, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuery(text)}
                className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              >
                {text}
              </button>
            ))}
          </div>

          {/* 人设切换区域 */}
          <div className="flex gap-2 mb-3">
            <button 
              type="button" 
              onClick={() => setQuery("请用温柔学姐的语气回答：")} 
              className="text-xs px-3 py-1.5 bg-pink-900/40 text-pink-300 rounded-full border border-pink-700/50 hover:bg-pink-900/60 transition-colors"
            >
              🌸 温柔学姐
            </button>
            <button 
              type="button" 
              onClick={() => setQuery("请用暴躁教授的语气，带点恨铁不成钢的情绪回答：")} 
              className="text-xs px-3 py-1.5 bg-red-900/40 text-red-300 rounded-full border border-red-700/50 hover:bg-red-900/60 transition-colors"
            >
              🤬 暴躁教授
            </button>
            <button 
              type="button" 
              onClick={() => setQuery("请用极其精简的机器人风格回答：")} 
              className="text-xs px-3 py-1.5 bg-blue-900/40 text-blue-300 rounded-full border border-blue-700/50 hover:bg-blue-900/60 transition-colors"
            >
              🤖 无情机器
            </button>
          </div>
                    <form
                        onSubmit={handleSubmit}
                        className="relative flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-2 rounded-2xl shadow-2xl shadow-black/50 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50"
                        autoComplete="off"
                    >
                        <input
                            type="text"
                            name="message"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="有什么烦恼都可以告诉学姐哦，比如：'我挂科了还能拿奖学金吗？'..."
                            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 px-4 py-3 outline-none min-w-0"
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="p-3 mr-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all duration-200 shadow-lg shadow-indigo-900/20 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                            aria-label="Send message"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 12h14M12 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </form>
                    <div className="mt-3 text-center">
                        <p className="text-xs text-zinc-600">
                            AI can make mistakes. Please verify important information.
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Modal Overlay */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">投喂资料给学姐</h2>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                                aria-label="Close modal"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Drag & Drop Zone */}
                            <div
                                className="border-2 border-dashed border-zinc-800 rounded-xl p-8 hover:bg-zinc-800/50 hover:border-zinc-600 transition-all text-center cursor-pointer group"
                                onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept=".txt,.pdf"
                                    disabled={uploading}
                                />
                                <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <p className="text-sm text-zinc-400 font-medium group-hover:text-zinc-200 transition-colors">点击上传，或者把资料拖进来</p>
                                <p className="text-xs text-zinc-600 mt-1">Supported formats: PDF, TXT (Max 5MB)</p>
                            </div>

                            {uploading && (
                                <div className="flex items-center justify-center gap-3 text-sm text-zinc-400 animate-pulse">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                    </span>
                                    Processing document... This may take a moment.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
