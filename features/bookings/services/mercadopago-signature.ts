import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMercadoPagoSignature({
  dataId,
  requestId,
  signature,
  secret,
}: {
  dataId: string | null;
  requestId: string | null;
  signature: string | null;
  secret: string | undefined;
}) {
  if (!dataId || !requestId || !signature || !secret) return false;

  const timestamp = signature.match(/(?:^|,)\s*ts=([^,]+)/)?.[1];
  const receivedHash = signature.match(/(?:^|,)\s*v1=([a-f0-9]+)/i)?.[1];
  if (!timestamp || !receivedHash || receivedHash.length !== 64) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest();
  const providedHash = Buffer.from(receivedHash, "hex");

  return providedHash.length === expectedHash.length && timingSafeEqual(providedHash, expectedHash);
}