/**
 * Worker の環境変数・シークレット。
 * 本番は `wrangler secret put`、ローカルは `.dev.vars` で設定する。
 */
export interface Env {
  /** Discord アプリケーション ID */
  DISCORD_APPLICATION_ID: string;
  /** Discord アプリケーションの Public Key（署名検証用） */
  DISCORD_PUBLIC_KEY: string;
  /** Discord Bot トークン（通知チャンネルへの投稿用） */
  DISCORD_TOKEN: string;
  /** カレンダー登録・更新を通知するチャンネル ID */
  DISCORD_NOTIFICATION_CHANNEL_ID: string;
  /** Google カレンダー ID */
  GOOGLE_CALENDAR_ID: string;
  /** Google サービスアカウントのキー JSON（ファイルの中身をそのまま） */
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
}
