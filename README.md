# AI 网页摘要

一键用 AI 总结网页内容，3秒获取核心观点。

## 功能

- 🚀 一键生成网页摘要
- 📝 多种摘要模式：简短/详细/要点/时间线
- 🤖 支持国内外多个 AI 模型
- 📋 一键复制摘要内容
- 🔒 隐私优先：API Key 本地存储

## 支持的模型

### 🇨🇳 国内免费模型（推荐）

| 模型 | 免费额度 | 获取 API Key |
|------|----------|--------------|
| **DeepSeek** ⭐ | 免费额度充足 | [platform.deepseek.com](https://platform.deepseek.com/) |
| 通义千问 | 100万 tokens/月 | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/) |
| 智谱 GLM-4 | 免费额度 | [open.bigmodel.cn](https://open.bigmodel.cn/) |
| Kimi | 免费额度 | [platform.moonshot.cn](https://platform.moonshot.cn/) |
| 零一万物 | 免费额度 | [platform.lingyiwanwu.com](https://platform.lingyiwanwu.com/) |

### 🌍 海外模型

| 模型 | 说明 |
|------|------|
| OpenAI GPT-4o | 需要付费订阅 |
| OpenAI GPT-3.5 | 较便宜 |
| Claude | 需要付费订阅 |

## 安装

### 开发模式安装

1. 下载或克隆此项目
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `ai-web-summary` 文件夹

## 配置

1. 点击插件图标
2. 点击右上角 ⚙️ 进入设置
3. 选择 API 提供商（推荐 DeepSeek）
4. 输入你的 API Key
5. 保存设置

### 如何获取 API Key（以 DeepSeek 为例）

1. 访问 [platform.deepseek.com](https://platform.deepseek.com/)
2. 注册/登录账号
3. 进入「API Keys」页面
4. 点击「创建 API Key」
5. 复制 Key 到插件设置

## 使用

1. 打开任意网页
2. 点击插件图标
3. 选择摘要模式
4. 点击「生成摘要」

## 图标

请将以下尺寸的图标放入 `icons/` 目录：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- 多 AI 模型 API

## License

MIT
