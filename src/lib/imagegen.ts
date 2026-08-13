// 通义万相（Wanx）文生图：调用 DashScope 图像生成接口（异步任务 + 轮询）。
// 复用 DashScope 的 key（即 .env.local 里的 OPENAI_API_KEY）。

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_BASE = "https://dashscope.aliyuncs.com/api/v1";

export interface GeneratedImage {
  imageUrl?: string;
  prompt?: string;
  error?: string;
}

interface DashScopeTask {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{ url?: string }>;
  };
}

export async function generateWanxImage(
  prompt: string,
  size = "1024*1024",
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.DASHSCOPE_IMAGE_MODEL ?? "wanx2.1-t2i-turbo";
  const base = process.env.DASHSCOPE_IMAGE_BASE_URL ?? DEFAULT_BASE;

  if (!apiKey) return { error: "缺少 API Key（OPENAI_API_KEY）" };

  // 1. 提交异步文生图任务
  let submit: DashScopeTask | undefined;
  try {
    const res = await fetch(
      `${base}/services/aigc/text2image/image-synthesis`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-DashScope-Async": "enable",
        },
        body: JSON.stringify({
          model,
          input: { prompt },
          parameters: { size, n: 1 },
        }),
      },
    );
    submit = (await res.json()) as DashScopeTask;
  } catch (e) {
    return { error: `提交任务失败：${(e as Error).message}` };
  }

  const taskId = submit?.output?.task_id;
  if (!taskId) {
    return { error: `创建任务失败：${JSON.stringify(submit).slice(0, 300)}` };
  }

  // 2. 轮询任务结果（每 3 秒一次，最多约 60 秒）
  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const pollRes = await fetch(`${base}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const poll = (await pollRes.json()) as DashScopeTask;
    const status = poll?.output?.task_status;

    if (status === "SUCCEEDED") {
      const imageUrl = poll?.output?.results?.[0]?.url;
      if (!imageUrl) return { error: "生成成功但未拿到图片地址" };
      return { imageUrl, prompt };
    }
    if (status === "FAILED" || status === "CANCELLED") {
      const label = status === "FAILED" ? "失败" : "被取消";
      return { error: `生成${label}：${JSON.stringify(poll).slice(0, 300)}` };
    }
  }

  return { error: "生成超时，请稍后重试" };
}
