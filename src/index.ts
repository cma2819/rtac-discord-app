import {
  type APIInteraction,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import type { Env } from './env';
import { verifyDiscordRequest } from './discord/verify';
import { handleInteraction } from './calendar/handler';

const json = (body: unknown, init?: ResponseInit) => Response.json(body, init);

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    const body = await request.text();
    const isValid = await verifyDiscordRequest(
      body,
      request.headers.get('X-Signature-Ed25519'),
      request.headers.get('X-Signature-Timestamp'),
      env.DISCORD_PUBLIC_KEY,
    );
    if (!isValid) {
      return new Response('Bad request signature', { status: 401 });
    }

    const interaction = JSON.parse(body) as APIInteraction;
    if (interaction.type === InteractionType.Ping) {
      return json({ type: InteractionResponseType.Pong });
    }

    const response = await handleInteraction(interaction, {
      env,
      waitUntil: (promise) => ctx.waitUntil(promise),
    });
    return json(response);
  },
} satisfies ExportedHandler<Env>;
