/**
 * スラッシュコマンドを Discord に登録する。
 *
 *   npm run register
 *
 * 環境変数（または .dev.vars）から DISCORD_TOKEN / DISCORD_APPLICATION_ID /
 * DISCORD_GUILD_ID を読み込む。DISCORD_GUILD_ID を省略するとグローバルコマンドとして登録する。
 */
import { existsSync } from 'node:fs';
import { commands } from '../src/calendar/commands';

if (existsSync('.dev.vars')) {
  process.loadEnvFile('.dev.vars');
}

const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    console.error(`環境変数 ${name} が設定されていません`);
    process.exit(1);
  }
  return value;
};

const token = required('DISCORD_TOKEN');
const applicationId = required('DISCORD_APPLICATION_ID');
const guildId = process.env.DISCORD_GUILD_ID;

const url = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

console.info(`Started refreshing ${commands.length} application (/) commands.`);

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${token}`,
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error(`Failed to register commands: ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}

const data = (await res.json()) as unknown[];
console.info(`Successfully reloaded ${data.length} application (/) commands.`);
