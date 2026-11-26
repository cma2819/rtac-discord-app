import type {
  APIMessage,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';
import type { Env } from '../env';

const API_BASE = 'https://discord.com/api/v10';

const discordFetch = async <T>(
  path: string,
  init: RequestInit & { botToken?: string },
): Promise<T> => {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set(
    'User-Agent',
    'DiscordBot (https://github.com/cma2819/rtac-discord-app, 1.0.0)',
  );
  if (init.botToken) {
    headers.set('Authorization', `Bot ${init.botToken}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(
      `Discord API ${init.method ?? 'GET'} ${path} failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as T;
};

/** インタラクションの元の応答を編集する（discord.js の editReply 相当） */
export const editOriginalResponse = (
  env: Env,
  interactionToken: string,
  body: RESTPatchAPIWebhookWithTokenMessageJSONBody,
) =>
  discordFetch<APIMessage>(
    `/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}/messages/@original`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );

/** Bot としてチャンネルにメッセージを投稿する */
export const createMessage = (
  env: Env,
  channelId: string,
  body: RESTPostAPIChannelMessageJSONBody,
) =>
  discordFetch<APIMessage>(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
    botToken: env.DISCORD_TOKEN,
  });

export const messageUrl = (
  guildId: string | undefined,
  message: Pick<APIMessage, 'id' | 'channel_id'>,
) =>
  `https://discord.com/channels/${guildId ?? '@me'}/${message.channel_id}/${message.id}`;
