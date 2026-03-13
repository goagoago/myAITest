# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Tools Box** — 免费在线工具箱（中文），部署在 Vercel，域名 `www.2074912.xyz`。
提供证件照制作、图片去水印/加水印、图片压缩、AI抠图、文档转换、AI图片/视频生成、屏幕录制、二维码生成、OCR文字识别、AI翻译/写作/旅行规划/头脑风暴等工具。

## 常用命令

```bash
pnpm dev          # 启动开发服务器（Vite 7）
pnpm build        # 构建生产版本
pnpm preview      # 预览构建产物
```

项目无测试框架和 lint 配置。

## 环境变量

复制 `.env.example` 为 `.env.local`，填入：
- `ZHIPU_API_KEY` — 智谱AI API密钥（用于聊天、视频生成）
- `SILICONFLOW_API_KEY` — 硅基流动API密钥（用于图片生成、去水印）

**不要**将密钥硬编码或提交到仓库。

## 技术栈

- **前端**：Vue 3（`<script setup>` + Composition API）、Vue Router 4、Vite 7
- **UI**：纯 CSS（新拟物/neumorphism 暗色主题），Lucide 图标，Lottie 动画；部分页面使用 SCSS（如 `ResumeBuilder.scss`）
- **后端**：Vercel Serverless/Edge Functions（`api/` 目录），本地开发通过 `vite.config.js` 中的自定义中间件代理 API
- **路径别名**：`@` → `src/`（在 `vite.config.js` 中配置）

## 架构

### 双层 API 代理模式

每个 AI 功能都有两套 API 实现，确保本地开发和生产环境一致：

1. **`api/*.js`** — Vercel Functions，生产环境使用。API 密钥从 `process.env` 读取。
2. **`vite.config.js` 中间件** — 本地开发用的 API 代理中间件（`chatApiMiddleware`、`watermarkRemovalMiddleware`、`videoApiMiddleware`），通过 `loadEnv` 读取本地 `.env.local` 中的密钥。
3. **`/api/image` 路由** — 使用 Vite 内置 `server.proxy` 代理到硅基流动。

**修改 API 逻辑时需同步更新两处（`api/*.js` 和 `vite.config.js` 中对应的中间件）。**

### Vercel Functions 运行时区分

| 文件 | 运行时 | 原因 |
|------|--------|------|
| `api/chat.js` | Edge | 轻量代理，支持流式响应透传 |
| `api/image.js` | Edge | 轻量代理 |
| `api/video.js` | Edge | 异步任务提交和状态查询 |
| `api/watermark-removal.js` | **Node.js** | 需要处理大体积 base64 图片，Edge 不适用；`maxDuration: 60` |

### 前端分层

```
src/
├── views/              # 页面组件（每个工具一个文件），路由懒加载
│   └── components/     # 页面专属子组件（如 resume/ 目录下的简历相关组件）
├── composables/        # 组合式函数（use*.js），封装各工具的业务逻辑
├── components/         # 全局共享组件（CursorEffect、PageLoader、LottieInteractive 等）
│   └── ui/             # 基础 UI 组件（CustomSelect 等）
├── layouts/            # MainLayout.vue — 全局布局（导航栏、页脚、视频背景、页面转场）
├── router/             # Vue Router 配置，所有路由在 index.js 中集中定义
├── assets/             # 静态资源（Lottie JSON、背景视频、SVG）
└── style.css           # 全局样式和 CSS 变量
```

### 关键模式

- **View ↔ Composable 对应**：多数页面视图（如 `WatermarkRemoval.vue`）对应一个 composable（如 `useWatermarkRemoval.js`），视图负责模板，composable 封装状态和逻辑。部分 composable 被多个视图共享（如 `useChat.js` 被翻译、写作、旅行等 AI 页面使用，`useImage.js`/`useImageToVideo.js` 被 `AIStudio.vue` 使用）。
- **路由集中定义**：所有路由在 `src/router/index.js` 中，均使用动态 `import()` 懒加载。`/media` 路由使用嵌套子路由（`MediaTools.vue` 作为父组件，含 `VideoCompress`、`ScreenRecord`、`AudioConvert` 子路由）。
- **页面专属组件**：复杂页面可在 `src/views/components/` 下建子目录存放专属组件（如 `resume/ResumeHero.vue`、`ResumeToolbar.vue` 等），与全局 `src/components/` 区分。
- **SEO**：`useSeo.js` 根据路由自动切换页面 `title`/`meta`；`index.html` 含结构化数据（JSON-LD）和 `<noscript>` 回退内容。
- **导航分组**：`MainLayout.vue` 中 `navGroups` 数组定义了导航栏的工具分类和路由映射，新增工具需同步更新此数组。

### 外部 API 集成

| 服务商 | 用途 | 模型 |
|--------|------|------|
| 智谱AI (bigmodel.cn) | 聊天、视频生成 | glm-4-flash、cogvideox-flash |
| 硅基流动 (siliconflow.cn) | 图片生成、去水印 | FLUX.1-schnell、Qwen-Image-Edit |

### 纯前端工具（无需后端）

图片压缩、证件照制作、AI抠图（`@imgly/background-removal`）、文档转换（`mammoth`/`docx`/`marked`/`pdfjs-dist`/`html2pdf.js`）、屏幕录制（MediaRecorder API）、二维码生成（`qrcode`）、OCR（`tesseract.js`）、音频转换/视频压缩（`@ffmpeg/ffmpeg` 浏览器端 WASM）均在浏览器端完成。

## 新增工具的标准流程

1. 创建 `src/views/NewTool.vue`（页面视图）
2. 创建 `src/composables/useNewTool.js`（业务逻辑）
3. 在 `src/router/index.js` 中添加路由（懒加载）
4. 在 `src/layouts/MainLayout.vue` 的 `navGroups` 中添加导航项
5. 如需后端 API：同时创建 `api/new-tool.js`（Vercel Function）和在 `vite.config.js` 中添加对应的开发中间件

## 部署

Vercel 部署，配置在 `vercel.json`：
- `api/` 目录自动部署为 Serverless Functions
- SPA fallback：所有非 API/静态资源路由 rewrite 到 `/index.html`
- 静态资源（`/assets/*`）设置长期不可变缓存
- `watermark-removal.js` 单独配置 `maxDuration: 60`、`memory: 1024`
