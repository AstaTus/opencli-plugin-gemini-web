# opencli-plugin-gemini-web

用于与 [Google Gemini](https://gemini.google.com/app) 网页版交互的 OpenCLI 插件。

## 前置条件

- 已安装 [OpenCLI](https://github.com/jackwener/opencli)（`npm install -g @jackwener/opencli`）
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

### 检查状态

```bash
opencli gemini-web status
```

### 开始新对话

```bash
opencli gemini-web new
```

### 向 Gemini 提问

```bash
# 简单问题（默认等待 180 秒）
opencli gemini-web ask "法国的首都是哪里？"

# 复杂问题，增加超时时间
opencli gemini-web ask "分析量子计算的原理和应用" --timeout 300
```

### 查看对话历史

```bash
opencli gemini-web history --limit 10
```

## 命令列表

| 命令 | 描述 |
|------|------|
| `status` | 检查 Gemini 登录状态 |
| `new` | 开始新对话 |
| `ask` | 发送消息并等待回复 |
| `history` | 列出最近的对话 |

## 输出格式

所有命令支持多种输出格式：

```bash
opencli gemini-web history -f json    # JSON 格式
opencli gemini-web history -f yaml    # YAML 格式
opencli gemini-web history -f table   # 表格格式（默认）
```

## 项目结构

```
opencli-plugin-gemini-web/
├── ask.ts            # 发送消息并等待回复 (TypeScript)
├── new.yaml          # 新建对话
├── history.yaml      # 历史记录
├── status.yaml       # 状态检查
├── package.json
├── AGENT.md
└── README.md
```

## 配置

**重要**：在 `~/.zshrc` 或 `~/.bashrc` 中添加以下配置以避免超时错误：

```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

然后重新加载：
```bash
source ~/.zshrc
```

## 使用方法

### 检查状态

```bash
opencli gemini-web status
```

### 开始新对话

```bash
opencli gemini-web new
```

### 向 Gemini 提问

```bash
# 简单问题（默认 300 秒超时）
opencli gemini-web ask "法国的首都是哪里？"

# 使用思考模式处理复杂问题
opencli gemini-web ask "分析量子计算的原理" --mode think

# 使用 Pro 模式处理高级任务
opencli gemini-web ask "编写一个复杂算法" --mode pro

# 使用 Deep Research 进行深度研究（默认 600 秒超时）
opencli gemini-web ask "对比 Python 和 JavaScript 生态系统" --deep-research

# 组合使用：Deep Research + Pro 模式
opencli gemini-web ask "分析 AI 行业趋势" --deep-research --mode pro

# 自定义超时时间
opencli gemini-web ask "复杂问题" --timeout 600
```

**参数说明：**
| 参数 | 默认值 | 描述 |
|------|--------|------|
| `--mode` | `quick` | 响应模式：quick, think, pro |
| `--deep-research` | `false` | 启用 Deep Research（可与 --mode 组合） |
| `--timeout` | 300/600 | 超时秒数（Deep Research 默认 600） |

**模式说明：**
- `quick`（默认）：快速响应
- `think`：深度思考，适合复杂问题
- `pro`：高级功能

**Deep Research** 可以与任意模式组合使用。

### 查看对话历史

```bash
opencli gemini-web history --limit 10
```

## 命令列表

| 命令 | 描述 |
|------|------|
| `status` | 检查 Gemini 登录状态 |
| `new` | 开始新对话 |
| `ask` | 发送消息并等待回复 |
| `history` | 列出最近的对话 |

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

### 空响应

- 确保页面已完全加载
- 尝试增加等待时间：`opencli gemini-web ask "..." --wait 30`

### 扩展未连接

请确保 OpenCLI Browser Bridge 扩展已安装并启用：
1. 从 [OpenCLI Releases](https://github.com/jackwener/opencli/releases) 下载 `opencli-extension.zip`
2. 解压后在 `chrome://extensions/` 中点击"加载已解压的扩展程序"
3. 运行 `opencli doctor` 验证连接

## 许可证

MIT

## 相关链接

- [OpenCLI](https://github.com/jackwener/opencli) - OpenCLI 主项目
- [OpenCLI 插件指南](https://github.com/jackwener/opencli/blob/main/docs/zh/guide/plugins.md)

## 免责声明

本仓库所有文件均由 Claude 使用 GLM-5 模型生成。
