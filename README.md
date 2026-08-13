# 多模态 Agent（视觉 + 图像生成 + 语音）

一个基于 **TypeScript + Next.js + Vercel AI SDK** 的多模态 Agent 项目。支持：

- **视觉理解**：上传图片对话、OCR 文字提取、图表分析、多图对比、结构化 JSON 提取、远程图片链接分析
- **图像生成**：文字描述生成图片
- **语音**：语音输入+ 语音回复

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16+ React 19 |
| 语言 | TypeScript|
| AI 框架 | Vercel AI SDK |
| 模型 | 通义千问 `qwen-vl-plus`（视觉）/ `qwen-plus`（文本 + 工具调用） |
| 图像生成 | 通义万相 `wanx2.1-t2i-turbo` |
| 语音 | CosyVoice `qwen-audio-3.0-tts-flash`+ 浏览器 Web Speech API |
| 校验 | Zod |
| 样式 | Tailwind CSS |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动
npm run dev
# 打开 http://localhost:3000
```

## 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts   # 流式 Agent 接口
│   │   └── tts/route.ts    # 语音合成接口
│   ├── layout.tsx          
│   └── page.tsx            # 入口页面
├── components/
│   └── chat.tsx            # 对话 UI（上传/压缩/流式/图片展示/语音播放）
└── lib/
    ├── model.ts            # provider 配置
    ├── prompts.ts          # 系统提示词 + 提取/图表/对比模板
    ├── router.ts           # ModalityRouter：按模态路由到不同模型
    ├── tools.ts            # Agent 工具
    ├── imagegen.ts         # 通义万相文生图
    ├── tts.ts              # 通义 CosyVoice 语音合成
    └── image.ts            # 前端 canvas 图片压缩
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | DashScope（阿里云百炼）API Key |
| `OPENAI_MODEL` | ❌ | 视觉模型，默认 `qwen-vl-plus` |
| `OPENAI_TEXT_MODEL` | ❌ | 文本模型，默认 `qwen-plus` |
| `OPENAI_BASE_URL` | ❌ | 默认 `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `DASHSCOPE_IMAGE_MODEL` | ❌ | 文生图模型，默认 `wanx2.1-t2i-turbo` |
| `DASHSCOPE_TTS_MODEL` | ❌ | TTS 模型，默认 `qwen-audio-3.0-tts-flash` |
| `DASHSCOPE_TTS_VOICE` | ❌ | TTS 音色，默认 `longanhuan_v3.6` |
