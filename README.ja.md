# opencli-plugin-gemini-web

[Google Gemini](https://gemini.google.com/app) ウェブインターフェースと対話するための OpenCLI プラグイン。

## 前提条件

- [OpenCLI](https://github.com/jackwener/opencli) がインストールされている（`npm install -g @jackwener/opencli`）
- Chrome ブラウザに **OpenCLI Browser Bridge** 拡張機能がインストールされている
  - [OpenCLI Releases](https://github.com/jackwener/opencli/releases) からダウンロード
  - `chrome://extensions/` で展開して読み込む
- Chrome で Gemini にログイン済み

## インストール

```bash
# GitHub からインストール
opencli plugin install github:your-username/opencli-plugin-gemini-web
```

## 使い方

### ステータス確認

```bash
opencli gemini status
```

### 新しい会話を開始

```bash
opencli gemini new
```

### Gemini に質問する

```bash
opencli gemini ask "フランスの首都はどこですか？"
opencli gemini ask "量子コンピューティングについて説明して" --wait 20
```

### 最新の回答を読み取る

```bash
opencli gemini read
```

### 会話履歴を表示

```bash
opencli gemini history --limit 10
```

## コマンド一覧

| コマンド | 説明 |
|----------|------|
| `status` | Gemini のログイン状態を確認 |
| `new` | 新しい会話を開始 |
| `ask` | Gemini にメッセージを送信して回答を取得 |
| `read` | 最新の回答を読み取る |
| `history` | 最近の会話を一覧表示 |

## 出力形式

すべてのコマンドは複数の出力形式をサポート：

```bash
opencli gemini history -f json    # JSON 形式
opencli gemini history -f yaml    # YAML 形式
opencli gemini history -f table   # テーブル形式（デフォルト）
```

## プロジェクト構成

```
opencli-plugin-gemini-web/
├── clis/
│   ├── ask.yaml      # メッセージ送信
│   ├── new.yaml      # 新規会話
│   ├── read.yaml     # 回答読み取り
│   ├── history.yaml  # 履歴一覧
│   └── status.yaml   # ステータス確認
├── package.json
├── AGENT.md
└── README.md
```

## トラブルシューティング

### 「ログインしていません」エラー

Chrome で Gemini にログインしていることを確認：
1. Chrome を開き https://gemini.google.com/app にアクセス
2. Google アカウントでログイン
3. コマンドを再実行

### 空のレスポンス

- ページが完全に読み込まれていることを確認
- 待機時間を増やす：`opencli gemini ask "..." --wait 30`

### 拡張機能が接続されていない

OpenCLI Browser Bridge 拡張機能がインストールされ有効になっていることを確認：
1. [OpenCLI Releases](https://github.com/jackwener/opencli/releases) から `opencli-extension.zip` をダウンロード
2. 解凍後、`chrome://extensions/` で「パッケージ化されていない拡張機能を読み込む」をクリック
3. `opencli doctor` を実行して接続を確認

## ライセンス

MIT

## 関連リンク

- [OpenCLI](https://github.com/jackwener/opencli) - OpenCLI メインプロジェクト
- [OpenCLI プラグインガイド](https://github.com/jackwener/opencli/blob/main/docs/guide/plugins.md)

## 免責事項

このリポジトリのすべてのファイルは、Claude が GLM-5 モデルを使用して生成したものです。
