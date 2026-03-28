# opencli-plugin-gemini-web

用于与 [Google Gemini](https://gemini.google.com/app) 网页版交互的 OpenCLI 插件。

[English](./README.md) | [日本語](./README.ja.md) | 中文

## 前置条件

- 已安装 [OpenCLI](https://github.com/jackwener/opencli)（`npm install -g @jackwener/opencli`）
- 已安装 [esbuild](https://esbuild.github.io/)（`npm i -g esbuild`）— TypeScript 插件编译所需
- Chrome 浏览器已安装 **OpenCLI Browser Bridge** 扩展
  - 从 [OpenCLI Releases](https://github.com/jackwener/opencli/releases) 下载
  - 在 `chrome://extensions/` 中加载已解压的扩展
- 已在 Chrome 中登录 Gemini

## 安装

```bash
# 通过 opencli 插件管理器
opencli plugin install github:AstaTus/opencli-plugin-gemini-web

# 或手动安装
git clone https://github.com/AstaTus/opencli-plugin-gemini-web \
  ~/.opencli/plugins/gemini-web
```

## 使用方法

```bash
# 快速模式（默认）
opencli gemini-web ask "法国的首都是哪里？"

# 思考模式，适合复杂问题
opencli gemini-web ask "详细解释量子计算" --mode think

# Pro 模式，高级功能
opencli gemini-web ask "编写一个复杂算法" --mode pro

# Deep Research 深度研究（默认 600 秒超时）
opencli gemini-web ask "对比 Python 和 JavaScript 生态系统" --deep-research

# 组合使用：Deep Research + 指定模式
opencli gemini-web ask "分析 AI 行业趋势" --deep-research --mode pro
```

## 参数说明

| 参数 | 默认值 | 描述 |
|------|--------|------|
| `prompt` | （必填） | 向 Gemini 提出的问题 |
| `--mode` | `quick` | 响应模式：`quick`、`think`、`pro` |
| `--deep-research` | `false` | 启用 Deep Research（可与 `--mode` 组合） |

## 模式说明

- `quick`（默认）— 快速响应
- `think` — 深度思考，适合复杂问题
- `pro` — 高级功能

## Deep Research

使用 `--deep-research` 时，插件会自动处理完整的研究流程：
1. 发送问题，等待 Gemini 生成研究思路
2. 自动点击"开始研究"
3. 等待研究完成，返回完整报告

## 配置

**重要**：在 `~/.zshrc` 或 `~/.bashrc` 中添加以下配置以避免超时错误：

```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

然后重新加载：
```bash
source ~/.zshrc
```

## 故障排除

### 超时错误

如果看到 `timed out after 60s`，请确保设置了环境变量：
```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

### "未登录" 错误

请确保已在 Chrome 中登录 Gemini：
1. 打开 Chrome 并访问 https://gemini.google.com/app
2. 使用 Google 账号登录
3. 重试命令

### 扩展未连接

请确保 OpenCLI Browser Bridge 扩展已安装并启用：
1. 从 [OpenCLI Releases](https://github.com/jackwener/opencli/releases) 下载 `opencli-extension.zip`
2. 解压后在 `chrome://extensions/` 中点击"加载已解压的扩展程序"
3. 运行 `opencli doctor` 验证连接

## 项目结构

```
opencli-plugin-gemini-web/
├── ask.ts            # 主命令（TypeScript）
├── package.json
└── README.md
```

## 许可证

MIT

## 相关链接

- [OpenCLI](https://github.com/jackwener/opencli) - OpenCLI 主项目
