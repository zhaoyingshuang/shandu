# 闪读 - AI 网页摘要

一键用 AI 总结网页内容，3秒获取核心观点。

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/hlkacennbhbfabbgcofeihnlmjinjcfc?label=Chrome%20Store)](https://chromewebstore.google.com/detail/hlkacennbhbfabbgcofeihnlmjinjcfc)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[安装闪读](https://chromewebstore.google.com/detail/hlkacennbhbfabbgcofeihnlmjinjcfc)** | **[官网](https://zhaoyingshuang.github.io/shandu/)**

## 功能

- 一键生成网页摘要
- 4 种摘要模式：简短 / 详细 / 要点 / 时间线
- 6 种语言翻译：中 / 英 / 日 / 韩 / 法 / 德
- 支持国内外多个 AI 模型，国内模型无需翻墙
- 快捷键操作：Ctrl+Shift+S 唤起，Ctrl+Shift+A 快速摘要
- 右键菜单：选中文字一键摘要或翻译
- 历史记录自动保存，支持导出 Markdown
- API Key 本地存储，隐私安全

## 支持的模型

### 国内免费模型（推荐）

| 模型 | 免费额度 | 获取 API Key |
|------|----------|--------------|
| **DeepSeek** | 免费额度充足 | [platform.deepseek.com](https://platform.deepseek.com/) |
| 通义千问 | 100万 tokens/月 | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) |
| 智谱 GLM-4 | 免费额度 | [open.bigmodel.cn](https://open.bigmodel.cn/) |
| Kimi | 免费额度 | [platform.moonshot.cn](https://platform.moonshot.cn/) |
| 零一万物 | 免费额度 | [platform.lingyiwanwu.com](https://platform.lingyiwanwu.com/) |

### 海外模型

| 模型 | 说明 |
|------|------|
| OpenAI GPT-4o | 需要付费订阅 |
| OpenAI GPT-3.5 | 较便宜 |
| Claude | 需要付费订阅 |

## 快速开始

1. [安装闪读](https://chromewebstore.google.com/detail/hlkacennbhbfabbgcofeihnlmjinjcfc)
2. 点击插件图标 → 设置 → 输入 API Key（推荐 [DeepSeek](https://platform.deepseek.com/)，免费注册）
3. 打开任意网页 → 点击图标 → 生成摘要

## 定价

- **免费版**：每天 5 次摘要，简短和详细模式
- **Pro 版**：¥49 一次买断，无限次 + 全部模式 + 翻译 + 导出

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- 多 AI 模型 API

## License

MIT
