const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> => {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const keyCache = new Map<string, Promise<CryptoKey>>();

const importPublicKey = (publicKey: string): Promise<CryptoKey> => {
  let key = keyCache.get(publicKey);
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    keyCache.set(publicKey, key);
  }
  return key;
};

/**
 * Discord から届いたリクエストの Ed25519 署名を検証する。
 * https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint-validating-security-request-headers
 */
export const verifyDiscordRequest = async (
  body: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string,
): Promise<boolean> => {
  if (!signature || !timestamp) {
    return false;
  }
  try {
    const key = await importPublicKey(publicKey);
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    );
  } catch {
    return false;
  }
};
