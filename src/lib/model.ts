import { createOpenAI } from "@ai-sdk/openai";

// 用 createOpenAI 以便支持自定义 baseURL（国内访问 OpenAI 常需走代理/中转）。
// 不设置 OPENAI_BASE_URL 时直连 OpenAI 官方接口；apiKey 缺省时回退到 OPENAI_API_KEY 环境变量。
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 视觉模型（理解图片）。默认 gpt-4.1，可改成 gpt-4o 或更新的多模态模型。
export const VISION_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

// 纯文本模型（更便宜、更快）。
// 注意：qwen-vl-plus 等视觉模型不支持 function calling，需要调工具的请求（画图/抓URL）
// 必须用支持工具的文本模型（如 qwen-plus）。
export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "qwen-plus";

export function getVisionModel() {
  // 用 openai.chat() 强制走 Chat Completions API（/chat/completions）。
  // 默认的 openai() 走的是 Responses API，千问/DeepSeek 等 OpenAI 兼容服务不支持。
  return openai.chat(VISION_MODEL);
}

export function getTextModel() {
  return openai.chat(TEXT_MODEL);
}
