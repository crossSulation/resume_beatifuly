# 简历编辑助手

基于 Vite + React + TailwindCSS + TypeScript 的简历编辑器：编辑完整简历，预览排版效果，并用 LLM 逐条优化经历描述、提供可落地的改进建议。

## 快速开始

```bash
npm install
npm run dev
```

## 接入真实 LLM

复制 `.env.example` 为 `.env.local`，填入配置后重启开发服务器：

```env
VITE_LLM_API_KEY=sk-your-key
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_MODEL=gpt-4o-mini
```

服务层使用 OpenAI 兼容的 Chat Completions 接口（`src/services/llm.js`），支持任意兼容网关。未配置 API Key 时自动使用内置模拟数据，方便先跑通界面。

## 功能

- 完整简历编辑：基本信息、个人简介、工作经历、项目经历、教育经历、专业技能
- 经历区块支持添加 / 删除 / 排序，职责条目可自由增删
- 逐条「✨ 优化」：LLM 改写该条目，返回改进建议与建议补充的量化指标，一键应用
- 「一键美化」：批量改写个人简介与全部经历条目，逐条勾选确认后统一应用，未勾选的保留原文
- 编辑 / 预览双模式，预览为可直接阅读的简历排版
- 导出 PDF（A4 多页）、导出带样式的独立 HTML、复制 Markdown
- 预览模式下可直接 Ctrl/Cmd + P 打印为 PDF（矢量文字，效果更佳）
- 本地自动保存（localStorage），刷新不丢失

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产包 |
| `npm run preview` | 本地预览生产构建 |
