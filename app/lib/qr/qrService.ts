import crypto from "crypto";

// Lightweight QR rendering using qrcode library when available in browser or node-canvas
// We avoid direct imports that might fail in edge runtimes by dynamic require.
type CanvasRenderingContext2DLike = CanvasRenderingContext2D | any;

export interface QrPayload {
  tracking_id: string;
  form_key: string;
}

export interface QrTokenEnvelope {
  v: number; // version
  iv: string; // base64url iv
  ct: string; // base64url ciphertext+tag
  ts: number; // issued at (unix seconds)
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Buffer {
  const pad = 4 - (str.length % 4 || 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(b64, "base64");
}

function getKey(): Buffer {
  const secret = process.env.QR_SECRET || process.env.NEXT_PUBLIC_QR_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("QR_SECRET is missing or too short");
  }
  // Derive 32-byte key from secret using PBKDF2 for portability
  return crypto.pbkdf2Sync(secret, "yec-qr-salt", 100_000, 32, "sha256");
}

export async function encryptQrPayload(payload: QrPayload): Promise<string> {
  // Browser path using Web Crypto if available
  const subtle: SubtleCrypto | undefined = (globalThis as any)?.crypto?.subtle;
  const text = JSON.stringify(payload);
  if (subtle) {
    const secret =
      process.env.NEXT_PUBLIC_QR_SECRET || process.env.QR_SECRET || "";
    if (!secret) throw new Error("QR_SECRET is missing");
    const enc = new TextEncoder();
    const salt = enc.encode("yec-qr-salt");
    const baseKey = await subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
    const key = await subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    const iv = crypto.randomBytes(12);
    const cipherBuf = (await subtle.encrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      enc.encode(text),
    )) as ArrayBuffer;
    const envelope: QrTokenEnvelope = {
      v: 1,
      iv: base64UrlEncode(Buffer.from(iv.buffer)),
      ct: base64UrlEncode(Buffer.from(new Uint8Array(cipherBuf))),
      ts: Math.floor(Date.now() / 1000),
    };
    return base64UrlEncode(Buffer.from(JSON.stringify(envelope), "utf8"));
  }

  // Node path
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plain = Buffer.from(text, "utf8");
  const encBuf = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: QrTokenEnvelope = {
    v: 1,
    iv: base64UrlEncode(iv),
    ct: base64UrlEncode(Buffer.concat([encBuf, tag])),
    ts: Math.floor(Date.now() / 1000),
  };
  return base64UrlEncode(Buffer.from(JSON.stringify(envelope), "utf8"));
}

export function decryptQrPayload(token: string): QrPayload {
  const key = getKey();
  const buf = base64UrlDecode(token);
  const env: QrTokenEnvelope = JSON.parse(buf.toString("utf8"));
  if (env.v !== 1 || !env.iv || !env.ct) {
    throw new Error("Invalid QR token");
  }
  const iv = base64UrlDecode(env.iv);
  const ctTag = base64UrlDecode(env.ct);
  if (ctTag.length < 16) throw new Error("Invalid QR ciphertext");
  const ct = ctTag.slice(0, ctTag.length - 16);
  const tag = ctTag.slice(ctTag.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  const payload = JSON.parse(dec.toString("utf8"));
  if (!payload?.tracking_id || !payload?.form_key) {
    throw new Error("QR payload missing fields");
  }
  return payload as QrPayload;
}

export async function renderQrToCanvas(
  ctx: CanvasRenderingContext2DLike,
  x: number,
  y: number,
  size: number,
  token: string,
): Promise<void> {
  // Dynamic import qrcode to work both server and client
  const QRCode = await import("qrcode");
  const tmp = (
    typeof document !== "undefined"
      ? document.createElement("canvas")
      : new (await import("canvas")).Canvas(size, size)
  ) as HTMLCanvasElement;

  await QRCode.toCanvas(tmp as any, token, {
    width: size,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  // Draw white background box to ensure readability
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, size, size);
  ctx.drawImage(tmp as any, x, y, size, size);
  ctx.restore();
}
