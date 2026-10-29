import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message;
    console.log("\n=== 收到消息:", message);

    const apiKey = process.env.OPENAI_API_KEY;
    let context = "暂无知识库内容";

    // 尝试读取刚刚上传的文档内容
    try {
      const dataFile = path.resolve(process.cwd(), "documents", "knowledge.json");
      const dataStr = await fs.readFile(dataFile, "utf-8");
      const data = JSON.parse(dataStr);
      if (data.content) {
        // 截取前 5000 个字作为背景信息，防止超出限制
        context = data.content.substring(0, 5000); 
        console.log("=== 成功读取到知识库内容 ===");
      }
    } catch (e) {
      console.log("=== 未找到知识库文件，使用默认回答 ===");
    }

    console.log("=== 正在向智谱请求 AI 回答... ===");
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { 
            role: "system", 
            content: `你是一个课程助手。请务必根据以下背景信息回答用户的问题。如果背景信息里没有答案，就说不知道。\n\n背景信息：\n${context}` 
          },
          { role: "user", content: message }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 智谱接口报错了:", errorText);
      return NextResponse.json({ error: "请求AI失败" }, { status: 500 });
    }

    const data = await response.json();
    console.log("✅ 智谱返回成功！");
    const aiText = data.choices[0].message.content;

    return NextResponse.json({ response: aiText });

  } catch (error) {
    console.error("🚨 本机代码报错:", error);
    return NextResponse.json({ error: "本机代码报错" }, { status: 500 });
  }
}