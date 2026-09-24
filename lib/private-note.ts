type EncryptedNote = { version: 1; salt: string; iv: string; data: string };
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(bytes)));
const decode = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
async function keyFor(code: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptNote(
  text: string,
  code: string,
  owner: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(code, salt);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(owner) },
    key,
    new TextEncoder().encode(text),
  );
  const note: EncryptedNote = {
    version: 1,
    salt: encode(salt),
    iv: encode(iv),
    data: encode(new Uint8Array(data)),
  };
  return JSON.stringify(note);
}
export async function decryptNote(
  value: string,
  code: string,
  owner: string,
): Promise<string> {
  const note = JSON.parse(value) as EncryptedNote;
  if (note.version !== 1) throw Error("Unsupported note");
  const key = await keyFor(code, decode(note.salt));
  const data = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decode(note.iv),
      additionalData: new TextEncoder().encode(owner),
    },
    key,
    decode(note.data),
  );
  return new TextDecoder().decode(data);
}
