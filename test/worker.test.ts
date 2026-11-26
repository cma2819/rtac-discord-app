import { describe, expect, it } from 'vitest';
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ComponentType,
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from 'discord-api-types/v10';
import worker from '../src/index';
import { createSigner, makeEnv } from './helpers';

const signer = await createSigner();
const env = makeEnv(signer.publicKey);
const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

const call = async (payload: unknown, sign = true) => {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {};
  if (sign) {
    const { signature, timestamp } = await signer.sign(body);
    headers['X-Signature-Ed25519'] = signature;
    headers['X-Signature-Timestamp'] = timestamp;
  }
  const request = new Request('https://example.com/', {
    method: 'POST',
    headers,
    body,
  });
  return worker.fetch(request as never, env, ctx);
};

describe('worker', () => {
  it('署名がないリクエストは 401', async () => {
    const res = await call({ type: InteractionType.Ping }, false);
    expect(res.status).toBe(401);
  });

  it('不正な署名は 401', async () => {
    const body = JSON.stringify({ type: InteractionType.Ping });
    const { signature, timestamp } = await signer.sign('other body');
    const res = await worker.fetch(
      new Request('https://example.com/', {
        method: 'POST',
        headers: {
          'X-Signature-Ed25519': signature,
          'X-Signature-Timestamp': timestamp,
        },
        body,
      }) as never,
      env,
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it('PING には PONG を返す', async () => {
    const res = await call({ type: InteractionType.Ping });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: InteractionResponseType.Pong });
  });

  it('/calendar submit でモーダルを開く', async () => {
    const res = await call({
      type: InteractionType.ApplicationCommand,
      token: 't',
      data: {
        type: ApplicationCommandType.ChatInput,
        name: 'calendar',
        options: [
          { type: ApplicationCommandOptionType.Subcommand, name: 'submit' },
        ],
      },
    });
    const json = (await res.json()) as {
      type: number;
      data: { custom_id: string; components: unknown[] };
    };
    expect(json.type).toBe(InteractionResponseType.Modal);
    expect(json.data.custom_id).toBe('submit-calendar');
    expect(json.data.components).toHaveLength(4);
  });

  it('入力が不正なモーダル送信はエラーを返し、カレンダーには登録しない', async () => {
    const field = (custom_id: string, value: string) => ({
      type: ComponentType.ActionRow,
      components: [{ type: ComponentType.TextInput, custom_id, value }],
    });
    let waited = false;
    const res = await worker.fetch(
      await (async () => {
        const body = JSON.stringify({
          type: InteractionType.ModalSubmit,
          token: 't',
          data: {
            custom_id: 'submit-calendar',
            components: [
              field('event-name', 'RTA'),
              field('start-at', '2026-01-01'),
              field('end-at', '2026/02/30'),
              field('details', ''),
            ],
          },
        });
        const { signature, timestamp } = await signer.sign(body);
        return new Request('https://example.com/', {
          method: 'POST',
          headers: {
            'X-Signature-Ed25519': signature,
            'X-Signature-Timestamp': timestamp,
          },
          body,
        }) as never;
      })(),
      env,
      {
        ...ctx,
        waitUntil: () => {
          waited = true;
        },
      } as unknown as ExecutionContext,
    );
    const json = (await res.json()) as {
      type: number;
      data: { content: string; flags: number };
    };
    expect(json.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect(json.data.flags).toBe(MessageFlags.Ephemeral);
    expect(json.data.content).toContain('カレンダーの作成に失敗しました');
    expect(json.data.content).toContain('yyyy/mm/dd形式で入力してください');
    expect(json.data.content).toContain('存在しない日付です');
    expect(waited).toBe(false);
  });

  it('削除キャンセルボタンはメッセージを更新する', async () => {
    const res = await call({
      type: InteractionType.MessageComponent,
      token: 't',
      data: {
        component_type: ComponentType.Button,
        custom_id: 'delete-calendar-cancel:abc',
      },
    });
    expect(await res.json()).toEqual({
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: 'カレンダーの削除がキャンセルされました。',
        components: [],
      },
    });
  });
});
