# rtac-discord-app

Discord から Google カレンダーにイベントを登録・編集・削除するアプリです。
Discord の [Interactions Endpoint](https://discord.com/developers/docs/interactions/overview#configuring-an-interactions-endpoint-url)（HTTP でインタラクションを受け取る方式）として、Cloudflare Workers 上で動きます。常駐プロセスや Gateway 接続は不要です。

## 機能

- `/calendar submit` でモーダルを開き、イベント名・開始日・終了日・詳細を入力して Google カレンダーに終日イベントを登録
- 登録・更新すると通知チャンネルに Embed を投稿（「編集」「削除」ボタン付き）
- 「編集」ボタンで内容を編集、「削除」ボタンで確認の上で削除

## 構成

```
src/
  index.ts             Worker のエントリポイント（署名検証・PING 応答）
  env.ts               環境変数の型
  calendar/            /calendar コマンド・モーダル・ボタンの処理
  discord/             署名検証、Discord REST API、コンポーネント helper
  google/              サービスアカウント認証と Google Calendar API（fetch で実装）
scripts/register.ts    スラッシュコマンドの登録スクリプト
```

Discord には 3 秒以内に応答する必要があるため、Google カレンダーへの登録や通知の投稿は先に応答を返してから `ctx.waitUntil` で実行し、終わったら元の応答を編集します。

## 必要なもの

- Node.js 22 以上
- Cloudflare アカウント
- Discord アプリケーション（Bot）
  - 通知チャンネルで「メッセージを送信」「埋め込みリンク」できる権限で Bot をサーバーに招待しておく
- Google Cloud のサービスアカウントとキー（JSON）
  - 対象のカレンダーをサービスアカウントのメールアドレスに「予定の変更」権限で共有しておく

## 環境変数

| 名前                              | 内容                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `DISCORD_APPLICATION_ID`          | Discord アプリケーション ID                                                      |
| `DISCORD_PUBLIC_KEY`              | Discord アプリケーションの Public Key（Developer Portal の General Information） |
| `DISCORD_TOKEN`                   | Bot トークン                                                                     |
| `DISCORD_NOTIFICATION_CHANNEL_ID` | 通知を投稿するチャンネル ID                                                      |
| `GOOGLE_CALENDAR_ID`              | Google カレンダー ID                                                             |
| `GOOGLE_SERVICE_ACCOUNT_KEY`      | サービスアカウントのキー JSON の中身                                             |
| `DISCORD_GUILD_ID`                | コマンド登録スクリプト用。登録先サーバー ID（省略するとグローバルコマンド）      |

## セットアップ

```sh
npm install
```

### 1. デプロイ

```sh
npx wrangler login
npm run deploy
```

デプロイ後、シークレットを設定します。

```sh
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
npx wrangler secret put DISCORD_NOTIFICATION_CHANNEL_ID
npx wrangler secret put GOOGLE_CALENDAR_ID
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY < service-account.json
```

### 2. Interactions Endpoint URL を設定

[Discord Developer Portal](https://discord.com/developers/applications) のアプリの General Information にある **Interactions Endpoint URL** に、デプロイした Worker の URL（例: `https://rtac-discord-app.<subdomain>.workers.dev`）を入力して保存します。
保存時に Discord が署名付きの PING を送るので、シークレットが正しく設定されていれば保存できます。

### 3. コマンドを登録

`.dev.vars` を作るか、環境変数で `DISCORD_TOKEN` / `DISCORD_APPLICATION_ID` / `DISCORD_GUILD_ID` を渡して実行します。

```sh
cp .dev.vars.example .dev.vars   # 値を埋める
npm run register
```

コマンドの定義（`src/calendar/commands.ts`）を変更したときも再実行してください。

## ローカル開発

```sh
cp .dev.vars.example .dev.vars   # 値を埋める
npm run dev
```

Discord から届くようにするには、`cloudflared tunnel --url http://localhost:8787` などで公開 URL を作り、Interactions Endpoint URL に一時的に設定します。

## スクリプト

| コマンド            | 内容                          |
| ------------------- | ----------------------------- |
| `npm run dev`       | `wrangler dev` でローカル実行 |
| `npm run deploy`    | Cloudflare Workers にデプロイ |
| `npm run register`  | スラッシュコマンドを登録      |
| `npm test`          | テスト（vitest）              |
| `npm run typecheck` | 型チェック                    |
| `npm run lint`      | ESLint                        |
