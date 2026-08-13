import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";
import { routeModality } from "@/lib/router";
import { createTools } from "@/lib/tools";

// 图片以 data URL 形式从客户端传来，服务端不需要 fs，但 analyzeImageUrl 用到了 Buffer，
// 因此显式指定 nodejs 运行时。
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // 1. UI 消息 → 模型消息（把图片 file part 转成模型可识别的 image part）
  const modelMessages = await convertToModelMessages(messages);

  // 2. 模态路由：纯文本用便宜模型，带图用视觉模型
  const { model } = routeModality(modelMessages);

  // 3. 注册工具（闭包捕获本轮消息，工具能拿到图片上下文）
  const tools = createTools(modelMessages);

  // 4. 流式生成；stopWhen 允许多步工具调用（模型可连续调用多个工具再作答）
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
