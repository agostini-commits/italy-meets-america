/**
 * Google APIs with a service account, no extra dependencies.
 * Env GOOGLE_SERVICE_ACCOUNT_JSON = the JSON key of the service account (GitHub secret).
 * The service account sees only what is shared with it: the data sheet (Editor, to write the
 * publish log) and the photo folder on Drive (Viewer).
 */
import { createSign } from 'node:crypto';

/** API addresses: Google by default; overridable only to test the pipeline against a local fake server. */
export const API = {
  sheets: process.env.GOOGLE_SHEETS_API ?? 'https://sheets.googleapis.com',
  drive: process.env.GOOGLE_DRIVE_API ?? 'https://www.googleapis.com',
};

export const SCOPES = {
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
  driveRead: 'https://www.googleapis.com/auth/drive.readonly',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function serviceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set (GitHub secret with the service account key).');
  let key: ServiceAccount;
  try {
    key = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: paste the whole key file.');
  }
  if (!key.client_email || !key.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON: client_email or private_key missing.');
  return key;
}

/** Signed JWT for the OAuth "jwt-bearer" flow (exported for the tests). */
export function signedJwt(key: ServiceAccount, scopes: string[], now = Math.floor(Date.now() / 1000)): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const aud = key.token_uri ?? 'https://oauth2.googleapis.com/token';
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: key.client_email, scope: scopes.join(' '), aud, iat: now, exp: now + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  return `${unsigned}.${sig}`;
}

const tokens = new Map<string, Promise<string>>();

export function googleToken(scopes: string[]): Promise<string> {
  const k = scopes.join(' ');
  if (!tokens.has(k)) {
    tokens.set(
      k,
      (async () => {
        const key = serviceAccount();
        const res = await fetch(key.token_uri ?? 'https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signedJwt(key, scopes) }),
        });
        const body = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
        if (!res.ok || !body.access_token) throw new Error(`Google login failed (${res.status}): ${body.error_description ?? 'no token'}`);
        return body.access_token;
      })(),
    );
  }
  return tokens.get(k)!;
}

/** Call a Google API; clear messages for the usual mistakes (not shared, wrong id). */
export async function gfetch(url: string, scopes: string[], init: RequestInit = {}): Promise<Response> {
  const token = await googleToken(scopes);
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` } });
  if (res.ok) return res;
  const text = await res.text().catch(() => '');
  const hint =
    res.status === 403 || res.status === 404
      ? ` — is the file/folder shared with the service account (${(() => { try { return serviceAccount().client_email; } catch { return '?'; } })()})?`
      : '';
  throw new Error(`Google API ${res.status} on ${url.split('?')[0]}${hint}\n${text.slice(0, 300)}`);
}
