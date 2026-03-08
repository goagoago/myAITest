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
- **UI**：纯 CSS（新拟物/neumorphism 暗色主题），Lucide 图标，Lottie 动画
- **后端**：Vercel Serverless/Edge Functions（`api/` 目录），本地开发通过 `vite.config.js` 中的自定义中间件代理 API

## 架构

### 双层 API 代理模式

每个 AI 功能都有两套 API 实现，确保本地开发和生产环境一致：

1. **`api/*.js`** — Vercel Serverless/Edge Functions，生产环境使用。API 密钥从 `process.env` 读取。
2. **`vite.config.js` 中间件** — 本地开发用的 API 代理中间件（`chatApiMiddleware`、`watermarkRemovalMiddleware`、`videoApiMiddleware`），通过 `loadEnv` 读取本地 `.env.local` 中的密钥。
3. **`/api/image` 路由** — 使用 Vite 内置 `server.proxy` 代理到硅基流动。

修改 API 逻辑时需同步更新两处。

### 前端分层

```
src/
├── views/          # 页面组件（每个工具一个文件），路由懒加载
├── composables/    # 组合式函数（use*.js），封装各工具的业务逻辑
├── components/     # 共享组件（CursorEffect、PageLoader、LottieInteractive 等）
│   └── ui/         # 基础 UI 组件
├── layouts/        # MainLayout.vue — 全局布局（导航栏、页脚、视频背景、页面转场）
├── router/         # Vue Router 配置，所有路由在 index.js 中集中定义
├── assets/         # 静态资源（Lottie JSON、背景视频、SVG）
└── style.css       # 全局样式和 CSS 变量
```

### 关键模式

- **View ↔ Composable 一一对应**：每个页面视图（如 `WatermarkRemoval.vue`）对应一个 composable（如 `useWatermarkRemoval.js`），视图负责模板，composable 封装状态和逻辑。
- **路由集中定义**：所有路由在 `src/router/index.js` 中，均使用动态 `import()` 懒加载。
- **SEO**：`useSeo.js` 根据路由自动切换页面 `title`/`meta`；`index.html` 含结构化数据（JSON-LD）和 `<noscript>` 回退内容。

### 外部 API 集成

| 服务商 | 用途 | 模型 |
|--------|------|------|
| 智谱AI (bigmodel.cn) | 聊天、视频生成 | glm-4-flash、cogvideox-flash |
| 硅基流动 (siliconflow.cn) | 图片生成、去水印 | FLUX.1-schnell、Qwen-Image-Edit |

### 纯前端工具（无需后端）

图片压缩、证件照制作、AI抠图（`@imgly/background-removal`）、文档转换（`mammoth`/`docx`/`marked`/`pdfjs-dist`/`html2pdf.js`）、屏幕录制（MediaRecorder API）、二维码生成（`qrcode`）、OCR（`tesseract.js`）均在浏览器端完成。

## 部署

Vercel 部署，配置在 `vercel.json`：
- `api/` 目录自动部署为 Serverless Functions
- SPA fallback：所有非 API/静态资源路由 rewrite 到 `/index.html`
- 静态资源（`/assets/*`）设置长期不可变缓存
