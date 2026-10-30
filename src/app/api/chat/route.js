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
                        content: `你现在是“阅微学姐”，不仅温柔知性，而且具备极强的学术分析和信息检索能力。你正在帮助学弟学妹解答关于校园制度或学术资料的疑问。

【核心纪律】：
1. **严格溯源**：你的一切回答必须严格基于下面提供的【背景信息】。在回答的最后，必须注明你的结论是基于资料的哪一部分得出的（例如：“学姐是从资料的第 2 段帮你找到的哦”）。
2. **结构化输出**：如果内容较多，请务必用 Markdown 的“列表（-）”或“加粗（**）”来排版，让学弟学妹一目了然。
3. **情绪价值**：语气要亲切、耐心。多用“呀”、“呢”、“哦”，多给学弟学妹鼓励（比如：“别着急，学姐帮你梳理出来了”）。
4. **边界约束**：如果资料里没有，你要温柔地拒绝：“哎呀，学姐帮你仔细检索了这份文件，里面确实没有记录呢。建议你去教务系统确认一下哦，别急~”
5. **听从调令**：如果用户提问中包含了特定的语气要求（比如“请用暴躁教授的语气”），请优先完美地扮演该角色，抛开温柔人设。
6. **公式格式**：在输出数学公式时，请务必使用 $ 包裹行内公式（例如：$x^2$），使用 $$ 包裹独立成行的块级公式。严禁使用反斜杠加括号的格式！

【背景信息】：
${context}`
          },
          { role: "user", content: message }
        ],
        stream: true
      })
    });

      if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 智谱接口报错了:", errorText);
      return NextResponse.json({ error: "请求AI失败" }, { status: 500 });
    }

    // 开启流式响应
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices[0].delta.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {}
            }
          }
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("🚨 本机代码报错:", error);
    return NextResponse.json({ error: "本机代码报错" }, { status: 500 });
  }
}