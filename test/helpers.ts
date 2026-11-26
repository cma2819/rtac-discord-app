import type { Env } from '../src/env';

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const createSigner = async () => {
  const keyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const publicKey = toHex(
    (await crypto.subtle.exportKey('raw', keyPair.publicKey)) as ArrayBuffer,
  );
  const sign = async (body: string, timestamp = `${Date.now()}`) => {
    const signature = toHex(
      await crypto.subtle.sign(
        { name: 'Ed25519' },
        keyPair.privateKey,
        new TextEncoder().encode(timestamp + body),
      ),
    );
    return { signature, timestamp };
  };
  return { publicKey, sign };
};

export const makeEnv = (publicKey: string): Env => ({
  DISCORD_APPLICATION_ID: 'app-id',
  DISCORD_PUBLIC_KEY: publicKey,
  DISCORD_TOKEN: 'bot-token',
  DISCORD_NOTIFICATION_CHANNEL_ID: 'channel-id',
  GOOGLE_CALENDAR_ID: 'calendar-id',
  GOOGLE_SERVICE_ACCOUNT_KEY: '{}',
});
