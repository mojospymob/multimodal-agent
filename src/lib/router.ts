import type { ModelMessage } from "ai";
import { getTextModel, getVisionModel } from "./model";

export type Modality = "text" | "image";

// 判断一条消息里是否包含图片（兼容 image part 与 file part 两种形态）。
function messageHasImage(message: ModelMessage): boolean {
  const content = message.content;
  if (typeof content === "string") return false;
  return content.some(
    (part) =>
      part.type === "image" ||
      (part.type === "file" &&
        typeof part.mediaType === "string" &&
        part.mediaType.startsWith("image")),
  );
}

/**
 * ModalityRouter：根据最后一条用户消息的模态，选择对应的处理策略。
 *
 * - 纯文本 → 便宜的文本模型
 * - 带图片 → 视觉模型
 *
 * 对应 Python 示例里的 ModalityRouter（text/image 路由）。
 * 后续接入语音时，在这里扩展 audio 分支即可。
 */
export function routeModality(messages: ModelMessage[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const modality: Modality =
    lastUser && messageHasImage(lastUser) ? "image" : "text";

  return {
    modality,
    model: modality === "image" ? getVisionModel() : getTextModel(),
  };
}
