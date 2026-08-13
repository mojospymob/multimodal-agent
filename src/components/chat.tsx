"use client";

import { useChat } from "@ai-sdk/react";
import type { FileUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import { compressImage, type CompressedImage } from "@/lib/image";

// 工具调用 part 的通用形状（输入/输出/状态），用于前端展示。
type AnyPart = {
  type: string;
  text?: string;
  url?: string;
  mediaType?: string;
  filename?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
};

// 浏览器 Web Speech API 的最小类型声明（用于语音识别）。
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult:
    | ((event: { results: Array<Array<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

const EXAMPLE_PROMPTS = [
  "描述这张图的内容",
  "提取这张发票的字段，输出 JSON",
  "分析这张图表的数据和趋势",
  "画一只戴太阳镜的柴犬坐在沙滩上",
];

export default function Chat() {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [listening, setListening] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { messages, sendMessage, status, error, stop } = useChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const compressed = await Promise.all(
        Array.from(files).map((f) => compressImage(f)),
      );
      setImages((prev) => [...prev, ...compressed]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && images.length === 0) || status === "streaming") return;

    const fileParts: FileUIPart[] = images.map((img) => ({
      type: "file",
      mediaType: img.mediaType,
      url: img.dataUrl,
      filename: img.filename,
    }));

    sendMessage({ text: input, files: fileParts });
    setInput("");
    setImages([]);
  }

  // 语音识别：把语音转成文字填入输入框（浏览器 Web Speech API）
  function toggleVoiceInput() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      alert("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      if (text) setInput((prev) => (prev ? prev + text : text));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onerror = (event) => {
      console.error("语音识别错误:", event);
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  // 语音合成：把助手的文字回复转成语音并播放
  async function playTTS(messageId: string, text: string) {
    if (!text.trim() || playingId) return;
    setPlayingId(messageId);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        audioRef.current?.pause();
        audioRef.current = new Audio(data.audioUrl);
        audioRef.current.play();
      } else {
        console.error("TTS 失败:", data.error);
      }
    } catch (e) {
      console.error("TTS 请求失败:", e);
    } finally {
      setPlayingId(null);
    }
  }

  const streaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* 顶部 */}
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">多模态视觉 Agent</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              上传图片即可对话 · 支持 OCR / 图表分析 / 多图对比 / 结构化提取
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              streaming
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            }`}
          >
            {streaming ? "思考中…" : "就绪"}
          </span>
        </div>
      </header>

      {/* 消息区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          {messages.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-lg font-medium">👋 上传一张图片，或直接输入问题</p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                试试拍照菜单翻译、发票字段提取、图表趋势分析
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                      : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    const p = part as AnyPart;
                    if (p.type === "text") {
                      return (
                        <div key={i} className="whitespace-pre-wrap">
                          {p.text}
                        </div>
                      );
                    }
                    if (p.type === "file" && (p.mediaType ?? "").startsWith("image")) {
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={p.url}
                          alt={p.filename ?? "上传的图片"}
                          className="mt-2 max-h-64 rounded-lg"
                        />
                      );
                    }
                    if (p.type.startsWith("tool-")) {
                      // 图片生成：直接展示图片（不折叠）
                      if (p.type === "tool-generateImage") {
                        const out = p.output as
                          | { imageUrl?: string; error?: string }
                          | undefined;
                        return (
                          <div
                            key={i}
                            className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
                          >
                            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              🖼️ 图片生成
                            </div>
                            {typeof out?.imageUrl === "string" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={out.imageUrl}
                                alt="AI 生成的图片"
                                className="mt-2 w-full max-h-96 rounded-lg object-contain"
                              />
                            ) : (
                              <div className="mt-1 text-xs text-red-500">
                                {out?.error ?? "生成中…"}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 其他工具：折叠展示入参/结果
                      return (
                        <details
                          key={i}
                          className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800"
                        >
                          <summary className="cursor-pointer font-mono text-zinc-500 dark:text-zinc-400">
                            🛠 {p.toolName ?? p.type}
                            {p.state ? ` · ${p.state}` : ""}
                          </summary>
                          {p.input !== undefined && (
                            <div className="mt-2">
                              <div className="font-semibold text-zinc-500">入参</div>
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                {JSON.stringify(p.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {p.output !== undefined && (
                            <div className="mt-2">
                              <div className="font-semibold text-zinc-500">结果</div>
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                                {JSON.stringify(p.output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </details>
                      );
                    }
                    return null;
                  })}
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => {
                        const text = message.parts
                          .filter((part) => part.type === "text")
                          .map((part) => (part as AnyPart).text ?? "")
                          .join("");
                        playTTS(message.id, text);
                      }}
                      disabled={playingId === message.id}
                      className="mt-2 text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      {playingId === message.id ? "⏳ 合成语音中…" : "🔊 播放语音"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
              ⚠️ {error.message ?? "出错了"}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* 输入区 */}
      <footer className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          {/* 待发送图片预览 */}
          {images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={img.filename}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={toggleVoiceInput}
              title="语音输入"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition-colors ${
                listening
                  ? "border-red-400 bg-red-50 dark:bg-red-900/30"
                  : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              }`}
            >
              {listening ? "🔴" : "🎤"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 text-lg transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              title="上传图片"
            >
              {isUploading ? "…" : "🖼️"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
              placeholder="输入问题，或上传图片后提问…（Enter 发送，Shift+Enter 换行）"
              className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
            />
            {streaming ? (
              <button
                type="button"
                onClick={() => stop()}
                className="h-10 shrink-0 rounded-xl bg-zinc-200 px-4 text-sm font-medium transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                停止
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && images.length === 0}
                className="h-10 shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
              >
                发送
              </button>
            )}
          </div>
        </form>
      </footer>
    </div>
  );
}
