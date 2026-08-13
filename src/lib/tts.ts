// 通义 CosyVoice 语音合成（TTS）：文字 → 语音。
// 复用 DashScope 的 key（即 .env.local 里的 OPENAI_API_KEY）。

const DEFAULT_TTS_URL =
  "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer";

export interface TTSResult {
  audioUrl?: string;
  error?: string;
}

interface TTSTask {
  output?: { audio?: { url?: string } };
  code?: string;
  message?: string;
}

export async function synthesizeSpeech(text: string): Promise<TTSResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.DASHSCOPE_TTS_MODEL ?? "qwen-audio-3.0-tts-flash";
  const voice = process.env.DASHSCOPE_TTS_VOICE ?? "longanhuan_v3.6";
  const url = process.env.DASHSCOPE_TTS_BASE_URL ?? DEFAULT_TTS_URL;

  if (!apiKey) return { error: "缺少 API Key（OPENAI_API_KEY）" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: { text, voice, format: "mp3" },
      }),
    });
    const json = (await res.json()) as TTSTask;

    if (res.status !== 200) {
      return { error: json?.message ?? json?.code ?? `TTS 失败 (${res.status})` };
    }
    const audioUrl = json?.output?.audio?.url;
    if (!audioUrl) return { error: "TTS 未返回音频地址" };
    return { audioUrl };
  } catch (e) {
    return { error: `语音合成失败：${(e as Error).message}` };
  }
}
