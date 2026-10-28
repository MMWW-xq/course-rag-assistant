import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body?.message;
    console.log("\n=== 收到消息:", message);

    const apiKey = process.env.OPENAI_API_KEY;
    // 打印一下前几位，确认 Key 读到了（别担心，这不会泄露完整密码）
    console.log("=== 当前读取到的 Key:", apiKey ? apiKey.substring(0, 8) + "..." : "没找到Key！");

    console.log("=== 正在直连智谱原生接口... ===");
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [{ role: "user", content: message }],
        stream: false // 先改成非流式，保证能拿到结果
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🚨 智谱接口报错了: 状态码", response.status, "详情:", errorText);
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