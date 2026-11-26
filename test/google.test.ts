import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleCalendar } from '../src/google/calendar';

const makeServiceAccountKey = async () => {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = (await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey,
  )) as ArrayBuffer;
  const b64 = Buffer.from(der).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;
  return {
    json: JSON.stringify({
      client_email: 'bot@example.iam.gserviceaccount.com',
      private_key: pem,
    }),
    publicKey: keyPair.publicKey,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GoogleCalendar', () => {
  it('署名した JWT でトークンを取得し、終日イベントとして登録する', async () => {
    const key = await makeServiceAccountKey();
    const requests: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, init });
        if (url === 'https://oauth2.googleapis.com/token') {
          return Response.json({ access_token: 'token', expires_in: 3600 });
        }
        return Response.json({
          id: 'ev1',
          htmlLink: 'https://calendar.google.com/ev1',
          summary: 'RTA',
          start: { date: '2026-01-01' },
          end: { date: '2026-01-04' },
        });
      }),
    );

    const calendar = new GoogleCalendar({
      calendarId: 'cal@group.calendar.google.com',
      serviceAccountKey: key.json,
    });
    const event = await calendar.add({
      name: 'RTA',
      startDate: '2026-01-01',
      endDate: '2026-01-03',
    });

    // JWT の署名が正しいこと
    const assertion = new URLSearchParams(
      requests[0].init!.body as URLSearchParams,
    ).get('assertion')!;
    const [h, c, s] = assertion.split('.');
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key.publicKey,
      Buffer.from(s, 'base64url'),
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(valid).toBe(true);

    // 終了日は翌日（排他的）で送る
    expect(requests[1].url).toBe(
      'https://www.googleapis.com/calendar/v3/calendars/cal%40group.calendar.google.com/events',
    );
    expect(JSON.parse(requests[1].init!.body as string)).toMatchObject({
      summary: 'RTA',
      start: { date: '2026-01-01' },
      end: { date: '2026-01-04' },
    });
    expect(event).toEqual({
      url: 'https://calendar.google.com/ev1',
      id: 'ev1',
      name: 'RTA',
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      details: undefined,
    });
  });
});
