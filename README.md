# 多模态视觉 Agent

一个基于 **TypeScript + Next.js + Vercel AI SDK** 的多模态视觉 Agent 项目。上传图片即可与 AI 对话，支持图片描述、OCR 文字提取、图表分析、多图对比、结构化 JSON 提取，以及远程图片链接分析。

> 由 Python 版多模态 Agent 概念（OpenAI Vision / ModalityRouter / VisionTool）用前端技术栈重写而成。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 |
| 语言 | TypeScript（strict） |
| AI 框架 | Vercel AI SDK v7（`ai` + `@ai-sdk/openai` + `@ai-sdk/react`） |
| 模型 | OpenAI `gpt-4.1`（视觉）/ `gpt-4.1-mini`（纯文本） |
| 校验 | Zod |
| 样式 | Tailwind CSS v4 |

## 快速开始

```bash
# 1. 安装依赖（项目已在 D 盘，npm 缓存与全局包也在 D 盘）
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 OPENAI_API_KEY
# 国内访问 OpenAI 可设置 OPENAI_BASE_URL 走中转/代理

# 3. 启动开发服务器
npm run dev
# 打开 http://localhost:3000
```

## 目录结构

```
src/
├── app/
│   ├── api/chat/route.ts   # 流式 Agent 接口（streamText + 工具调用）
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 入口页面
├── components/
│   └── chat.tsx            # 对话 UI（上传/压缩/流式渲染/工具展示）
└── lib/
    ├── model.ts            # OpenAI provider 配置（支持 baseURL 中转）
    ├── prompts.ts          # 系统提示词 + 结构化提取/图表/对比模板
    ├── router.ts           # ModalityRouter：按模态路由到不同模型
    ├── tools.ts            # Agent 工具（结构化提取 / 远程图片分析）
    └── image.ts            # 前端 canvas 图片压缩（省 token）
```

## 核心架构

### 1. Agent = 模型 + 工具 + 模态路由

请求流程（`app/api/chat/route.ts`）：

```
客户端 sendMessage({ text, files })
  → convertToModelMessages 把图片转成模型可识别的 image part
  → ModalityRouter 判定模态（纯文本/带图）
  → 注册工具（extractStructuredData / analyzeImageUrl）
  → streamText 流式生成，模型自主决定何时调用工具
```

### 2. 两个 Agent 工具（Tool Calling）

- **`extractStructuredData`**：从图片提取结构化 JSON（发票、表单、证件、图表数据）。内部用 `generateObject` + Zod schema，保证返回严格合法的 JSON。
- **`analyzeImageUrl`**：抓取远程图片 URL → 转 base64 → 视觉分析。模型本身无法访问外链，由工具代劳。

工具用 `tool({ description, inputSchema, execute })` 定义，LLM 根据用户意图自主调用——这是「agent」区别于普通 Chatbot 的关键。

### 3. 模态路由（ModalityRouter）

`lib/router.ts` 检测最后一条用户消息是否含图片：纯文本走便宜的 `gpt-4.1-mini`，带图走 `gpt-4.1`。后续接入语音时在 `routeModality` 里加 `audio` 分支即可。

### 4. 前端图片压缩

`lib/image.ts` 在浏览器端用 canvas 把图片等比缩到 1024px 并转 JPEG，降低视觉 API 的 token 消耗（对应 Python 版的 `optimize_image_for_api`，但放前端做，避免服务端装 sharp）。

## 与 Python 版概念的对应

| Python 概念 | 本项目实现 |
|---|---|
| `OpenAI().chat.completions.create` | `streamText({ model, messages })` |
| `ModalityRouter` | `lib/router.ts` 的 `routeModality` |
| `VisionTool.analyze_local_image` | 上传图片 → 消息里的 image part |
| `VisionTool.analyze_url_image` | `analyzeImageUrl` 工具 |
| `EXTRACT_PROMPT`（JSON 提取） | `extractStructuredData` 工具（`generateObject`） |
| `optimize_image_for_api` | `lib/image.ts` 前端 canvas 压缩 |
| `MultiTurnVisionChat` | `useChat` 自动维护多轮消息历史 |

## 扩展方向

- **语音**：`@ai-sdk/openai` 的 `openai.transcription()` / `openai.speech()`，或 Realtime API
- **图像生成**：`generateImage`（DALL-E / gpt-image）
- **PDF 文档**：`uploadFile` + `mediaType: 'application/pdf'`
- **多模型切换**：换成 `@ai-sdk/anthropic` / `@ai-sdk/google`，或在 `model.ts` 里用 Vercel AI Gateway 传 `'openai/xxx'` 字符串

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI API Key |
| `OPENAI_MODEL` | ❌ | 视觉模型，默认 `gpt-4.1` |
| `OPENAI_TEXT_MODEL` | ❌ | 纯文本模型，默认 `gpt-4.1-mini` |
| `OPENAI_BASE_URL` | ❌ | 中转/代理地址 |
