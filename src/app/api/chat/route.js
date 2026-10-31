import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
const messages = body?.messages; // 接收前端传来的历史数组

if (!messages || !Array.isArray(messages)) {
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
const currentQuestion = messages[messages.length - 1].content;
        console.log("\n=== 收到最新问题:", currentQuestion);

    const apiKey = process.env.OPENAI_API_KEY;
    let context = "暂无知识库内容";

    // 尝试读取刚刚上传的文档内容
    // 读取内置学生手册
    try {
      const dataFile = path.resolve(process.cwd(), "src", "data", "handbook.json");
      const dataStr = await fs.readFile(dataFile, "utf-8");
      const data = JSON.parse(dataStr);
      if (data.content) {
        // 截取前 5000 个字作为背景信息，防止超出限制
        context = data.content.substring(0, 40000); 
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
        model: "glm-4-plus",
        messages: [
          { 
            role: "system", 
            content: `你现在是“阅微”，不仅温柔知性，而且具备极强的学术分析和信息检索能力。
            
【核心纪律】：
1. **严格溯源**：必须严格基于【背景信息】回答，并在末尾注明结论是基于资料的哪一部分。
2. **结构化输出**：请多用 Markdown 的列表或加粗排版。
3. **情绪价值**：语气亲切、耐心，多用“呀”、“呢”、“哦”。
4. **听从调令**：如果用户要求了特定语气（如暴躁教授），请完美扮演。
5. **公式格式**：必须使用 $ 包裹行内公式（例如：$x^2$），使用 $$ 包裹块级公式。
6. **公式格式死命令（极度重要）**：
- 你可以使用基础的 LaTeX 公式（如 \int, \frac, \partial 等），**但是所有的公式必须、绝对、一定要用 $ 或 $$ 包裹起来！**
- 例如：必须写成 $\int_D (x^2+y^2) dxdy$，如果不加 $，前端会直接显示成乱码！
- 为了避免长公式解析崩溃，请尽量分步骤写，不要把极其复杂的多重积分写在一个 $ 里。
7. **精准引用条款**：在回答关于学校规定的问题时，**必须**指出该规定出自《学生手册》的哪一条/哪一款（例如：“根据《学生手册》第 45 条规定……”）。如果找不到确切条款，请如实说明，绝对不准自己编造条款号！
8. **计算过程强制规范（极度重要）**：在输出解题过程时，必须分成多行，一步一步写！
- **绝对禁止**在一个 $ 里面写连续多个等号（如 $a=b=c=d$）。
- **正确做法**：每一步单独写一行，例如：
  第一步：$\frac{\partial z}{\partial x} = 2x$
  第二步：代入数值 $x=1$，得到 $2$
- **禁止使用任何复杂的矩阵或对齐环境（如 \begin{aligned}）**，请用纯文本加分行来代替。如果乱用公式导致渲染失败，你将被扣分！
【背景信息】：
${context}`
          },
          ...messages // 把前端传来的多轮历史对话全部放进来
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