# opencli-plugin-gemini-web

[Google Gemini](https://gemini.google.com/app) ウェブインターフェースと対話するための OpenCLI プラグイン。

[English](./README.md) | [中文](./README.zh-CN.md) | 日本語

## 前提条件

- [OpenCLI](https://github.com/jackwener/opencli) がインストールされている（`npm install -g @jackwener/opencli`）
- Chrome ブラウザに **OpenCLI Browser Bridge** 拡張機能がインストールされている
  - [OpenCLI Releases](https://github.com/jackwener/opencli/releases) からダウンロード
  - `chrome://extensions/` で展開して読み込む
- Chrome で Gemini にログイン済み

## インストール

```bash
# opencli プラグインマネージャー経由
opencli plugin install github:AstaTus/opencli-plugin-gemini-web

# または手動インストール
git clone https://github.com/AstaTus/opencli-plugin-gemini-web \
  ~/.opencli/plugins/gemini-web
```

## 使い方

```bash
# クイックモード（デフォルト）
opencli gemini-web ask "フランスの首都はどこですか？"

# 思考モード（複雑な問題向け）
opencli gemini-web ask "量子コンピューティングについて詳しく説明して" --mode think

# Pro モード（高度な機能）
opencli gemini-web ask "複雑なアルゴリズムを書いて" --mode pro

# Deep Research（デフォルト 600 秒タイムアウト）
opencli gemini-web ask "Python と JavaScript の比較" --deep-research

# 組み合わせ：Deep Research + モード指定
opencli gemini-web ask "AI 業界のトレンド分析" --deep-research --mode pro
```

## パラメータ

| パラメータ | デフォルト | 説明 |
|------------|-----------|------|
| `prompt` | （必須） | Gemini に送信する質問 |
| `--mode` | `quick` | レスポンスモード：`quick`、`think`、`pro` |
| `--deep-research` | `false` | Deep Research を有効化（`--mode` と組み合わせ可能） |

## モード

- `quick`（デフォルト）— 高速レスポンス
- `think` — 深い思考による複雑な問題の解析
- `pro` — 高度な機能

## Deep Research

`--deep-research` 使用時、プラグインは自動的に研究フロー全体を処理します：
1. プロンプトを送信し、Gemini が研究計画を生成するのを待機
2. 「研究を開始」を自動クリック
3. 研究の完了を待機し、完全なレポートを返却

## 設定

**重要**：タイムアウトエラーを防ぐため、`~/.zshrc` または `~/.bashrc` に以下を追加：

```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

再読み込み：
```bash
source ~/.zshrc
```

## トラブルシューティング

### タイムアウトエラー

`timed out after 60s` が表示される場合、環境変数を設定：
```bash
export OPENCLI_BROWSER_COMMAND_TIMEOUT=350
```

### 「ログインしていません」エラー

Chrome で Gemini にログインしていることを確認：
1. Chrome を開き https://gemini.google.com/app にアクセス
2. Google アカウントでログイン
3. コマンドを再実行

### 拡張機能が接続されていない

OpenCLI Browser Bridge 拡張機能がインストールされ有効になっていることを確認：
1. [OpenCLI Releases](https://github.com/jackwener/opencli/releases) から `opencli-extension.zip` をダウンロード
2. 解凍後、`chrome://extensions/` で「パッケージ化されていない拡張機能を読み込む」をクリック
3. `opencli doctor` を実行して接続を確認

## プロジェクト構成

```
opencli-plugin-gemini-web/
├── ask.ts            # メインコマンド（TypeScript）
├── package.json
└── README.md
```

## ライセンス

MIT

## 関連リンク

- [OpenCLI](https://github.com/jackwener/opencli) - OpenCLI メインプロジェクト
