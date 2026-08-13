import { synthesizeSpeech } from "@/lib/tts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { text }: { text?: string } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "缺少 text 参数" }, { status: 400 });
  }

  const result = await synthesizeSpeech(text);
  if (result.error) {
    return Response.json(result, { status: 500 });
  }
  return Response.json(result);
}
