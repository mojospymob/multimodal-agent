import { generateObject, generateText, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { generateWanxImage } from "./imagegen";
import { getVisionModel } from "./model";
import { buildExtractInstruction } from "./prompts";

/**
 * 工具工厂：闭包捕获当前请求的 ModelMessage[]（含图片），
 * 这样工具在执行时能拿到本轮对话里的图片上下文。
 *
 * 返回的工具会注册给 streamText，由 LLM 自主决定何时调用（真正的 agent 行为）。
 */
export function createTools(messages: ModelMessage[]) {
  return {
    // 结构化提取：把图片内容提取成严格 JSON（发票/表单/证件/图表数据）
    extractStructuredData: tool({
      description:
        "从对话中的图片里提取结构化数据（如发票字段、表单、证件、图表数据）。当用户要求「提取 / 结构化 / JSON / 表格 / 字段」时调用。",
      inputSchema: z.object({
        fields: z
          .array(z.string())
          .describe("需要提取的字段名列表，例如 ['餐厅名', '金额', '日期']"),
      }),
      execute: async ({ fields }) => {
        const { object } = await generateObject({
          model: getVisionModel(),
          system: buildExtractInstruction(fields),
          messages,
          schema: z.object({
            results: z.array(
              z.object({
                field: z.string().describe("字段名"),
                value: z.string().nullable().describe("识别到的值，无法识别为 null"),
                confidence: z.enum(["high", "medium", "low"]),
              }),
            ),
          }),
        });
        return object;
      },
    }),

    // 抓取远程图片并分析：模型本身无法访问 URL，由工具下载后转为 base64 再交给视觉模型
    analyzeImageUrl: tool({
      description:
        "抓取一个远程图片 URL（http/https）并用视觉模型分析。当用户粘贴图片链接并希望分析时调用。",
      inputSchema: z.object({
        url: z.string().url().describe("图片的完整 URL"),
        question: z.string().describe("要对这张图片提出的问题"),
      }),
      execute: async ({ url, question }) => {
        const res = await fetch(url);
        if (!res.ok) {
          return { error: `下载失败，HTTP 状态码 ${res.status}` };
        }
        const contentType =
          res.headers.get("content-type") ?? "image/jpeg";
        const buffer = Buffer.from(await res.arrayBuffer());
        const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

        const { text } = await generateText({
          model: getVisionModel(),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: question },
                { type: "image", image: dataUrl },
              ],
            },
          ],
        });
        return { answer: text };
      },
    }),

    // 文生图：根据文字描述生成图片（通义万相）
    generateImage: tool({
      description:
        "根据文字描述生成一张图片（通义万相文生图）。当用户要求「画 / 生成 / 创建 / 设计」一张图片时调用。",
      inputSchema: z.object({
        prompt: z.string().describe("要生成的图片的文字描述"),
        size: z
          .enum(["1024*1024", "768*1024", "1024*768"])
          .optional()
          .describe("图片尺寸，默认 1024*1024"),
      }),
      execute: async ({ prompt, size }) => {
        return await generateWanxImage(prompt, size);
      },
    }),
  };
}
