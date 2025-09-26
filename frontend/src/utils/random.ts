const HEX: string[] = Array.from({ length: 256 }, (_, index) =>
  (index + 0x100).toString(16).slice(1)
);

const getCrypto = (): Crypto | undefined => {
  if (typeof globalThis === "undefined") {
    return undefined;
  }

  const crypto = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
  return typeof crypto === "object" ? crypto : undefined;
};

const fallbackWithCrypto = (crypto: Crypto): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Per RFC4122 section 4.4, set the version to 4 and variant to RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return (
    HEX[bytes[0]] +
    HEX[bytes[1]] +
    HEX[bytes[2]] +
    HEX[bytes[3]] +
    "-" +
    HEX[bytes[4]] +
    HEX[bytes[5]] +
    "-" +
    HEX[bytes[6]] +
    HEX[bytes[7]] +
    "-" +
    HEX[bytes[8]] +
    HEX[bytes[9]] +
    "-" +
    HEX[bytes[10]] +
    HEX[bytes[11]] +
    HEX[bytes[12]] +
    HEX[bytes[13]] +
    HEX[bytes[14]] +
    HEX[bytes[15]]
  );
};

const fallbackWithMathRandom = (): string => {
  let timestamp = Date.now();
  let performanceTime =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now() * 1000
      : 0;

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    let randomValue = Math.random() * 16;

    if (timestamp > 0) {
      randomValue = (timestamp + randomValue) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
    } else {
      randomValue = (performanceTime + randomValue) % 16 | 0;
      performanceTime = Math.floor(performanceTime / 16);
    }

    if (character === "x") {
      return randomValue.toString(16);
    }

    return ((randomValue & 0x3) | 0x8).toString(16);
  });
};

/**
 * Generate a RFC 4122 version 4 UUID, even in environments where
 * `crypto.randomUUID` is unavailable (e.g. legacy browsers).
 */
export const ensureCryptoRandomUUID = (): void => {
  const crypto = getCrypto();

  if (!crypto || typeof crypto.randomUUID === "function") {
    return;
  }

  const polyfill =
    typeof crypto.getRandomValues === "function"
      ? () => fallbackWithCrypto(crypto)
      : fallbackWithMathRandom;

  (crypto as Crypto & { randomUUID: () => string }).randomUUID = polyfill;
};

export const safeRandomUUID = (): string => {
  const crypto = getCrypto();

  if (crypto) {
    const { randomUUID } = crypto as Crypto & { randomUUID?: () => string };

    if (typeof randomUUID === "function") {
      try {
        return randomUUID.call(crypto);
      } catch (error) {
        // ignore and fall back to alternate strategies
      }
    }

    if (typeof crypto.getRandomValues === "function") {
      return fallbackWithCrypto(crypto);
    }
  }

  return fallbackWithMathRandom();
};

export const prefixedRandomId = (prefix: string): string =>
  `${prefix}-${safeRandomUUID()}`;
