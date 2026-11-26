import { z } from 'zod';

const ServiceAccountKeySchema = z.object({
  client_email: z.string(),
  private_key: z.string(),
  token_uri: z.string().default('https://oauth2.googleapis.com/token'),
});

const SCOPE = 'https://www.googleapis.com/auth/calendar';

const base64Url = (input: string | ArrayBuffer): string => {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const pemToDer = (pem: string): ArrayBuffer => {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

let cached: { email: string; token: string; expiresAt: number } | undefined;

/**
 * サービスアカウントの JWT を署名してアクセストークンを取得する。
 * googleapis は Workers 上で動かないため、Web Crypto で実装している。
 * https://developers.google.com/identity/protocols/oauth2/service-account#httprest
 */
export const getAccessToken = async (keyJson: string): Promise<string> => {
  const key = ServiceAccountKeySchema.parse(JSON.parse(keyJson));
  if (
    cached &&
    cached.email === key.client_email &&
    cached.expiresAt - 60_000 > Date.now()
  ) {
    return cached.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(key.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to get Google access token: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    email: key.client_email,
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
};
