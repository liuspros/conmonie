// Fingerprint / Face ID lock using the phone's own biometric check (WebAuthn platform authenticator).
// The app never sees biometrics: the phone only answers yes or no. Only a credential id is kept on this device.
const K = (u) => 'conmonie-bio-' + u;
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const rnd = () => crypto.getRandomValues(new Uint8Array(32));

export async function bioSupported() {
  try { return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())); } catch { return false; }
}
export const hasBio = (u) => { try { return !!localStorage.getItem(K(u)); } catch { return false; } };
export const clearBio = (u) => { try { localStorage.removeItem(K(u)); } catch {} };

export async function enrollBio(user, name) {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: rnd(), rp: { name: 'Conmonie', id: location.hostname },
    user: { id: new TextEncoder().encode(user.uid), name: user.email || user.uid, displayName: name || 'Member' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    attestation: 'none', timeout: 60000,
  } });
  if (!cred) throw new Error('cancelled');
  localStorage.setItem(K(user.uid), b64(cred.rawId));
}

// Throws unless the phone confirmed the person (fingerprint, face, or the phone's own screen lock).
export async function verifyBio(uid) {
  const id = localStorage.getItem(K(uid));
  if (!id) return true;
  const a = await navigator.credentials.get({ publicKey: {
    challenge: rnd(), rpId: location.hostname, userVerification: 'required', timeout: 60000,
    allowCredentials: [{ type: 'public-key', id: unb64(id), transports: ['internal'] }],
  } });
  if (!a || !(new Uint8Array(a.response.authenticatorData)[32] & 4)) throw new Error('not verified');
  return true;
}
