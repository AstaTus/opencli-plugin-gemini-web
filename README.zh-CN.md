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
opencli gemini status
```

### 开始新对话

```bash
opencli gemini new
```

### 向 Gemini 提问

```bash
opencli gemini ask "法国的首都是哪里？"
opencli gemini ask "解释量子计算" --wait 20
```

### 读取最后回复

```bash
opencli gemini read
```

### 查看对话历史

```bash
opencli gemini history --limit 10
```

## 命令列表

| 命令 | 描述 |
|------|------|
| `status` | 检查 Gemini 登录状态 |
| `new` | 开始新对话 |
| `ask` | 向 Gemini 发送消息并获取回复 |
| `read` | 读取最后一条回复 |
| `history` | 列出最近的对话 |

## 输出格式

所有命令支持多种输出格式：

```bash
opencli gemini history -f json    # JSON 格式
opencli gemini history -f yaml    # YAML 格式
opencli gemini history -f table   # 表格格式（默认）
```

## 项目结构

```
opencli-plugin-gemini-web/
├── clis/
│   ├── ask.yaml      # 发送消息
│   ├── new.yaml      # 新建对话
│   ├── read.yaml     # 读取回复
│   ├── history.yaml  # 历史记录
│   └── status.yaml   # 状态检查
├── package.json
├── AGENT.md
└── README.md
```

## 故障排除

### "未登录" 错误

请确保已在 Chrome 中登录 Gemini：
1. 打开 Chrome 并访问 https://gemini.google.com/app
2. 使用 Google 账号登录
3. 重试命令

### 空响应

- 确保页面已完全加载
- 尝试增加等待时间：`opencli gemini ask "..." --wait 30`

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
