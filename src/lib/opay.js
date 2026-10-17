// "Pay with OPay": copies the 10-digit account number (digits only, so OPay's clipboard detection can read it) and then opens
// the OPay app. Android launches it by package name; if it is not installed Chrome falls back to the Play Store. iPhones cannot
// open an app without a URL scheme, so the App Store page opens (it shows an Open button when OPay is installed).
// CHECK: the Android package id below was given as com.opay.pay; confirm it against OPay's Play Store URL (?id=...).
export const OPAY = { androidPackage: 'com.opay.pay', playFallback: 'https://play.google.com/store/search?q=opay&c=apps', ios: 'https://apps.apple.com/app/id1463776084' };

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch { return false; }
}
export async function payWithOpay(account) {
  const digits = String(account || '').replace(/\D/g, '').slice(0, 10);
  const copied = digits.length === 10 ? await copyText(digits) : false;
  const ua = navigator.userAgent, android = /android/i.test(ua), ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (android) window.location.href = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=' + OPAY.androidPackage + ';S.browser_fallback_url=' + encodeURIComponent(OPAY.playFallback) + ';end';
  else if (ios) window.location.href = OPAY.ios;
  return { copied, platform: android ? 'android' : ios ? 'ios' : 'desktop' };
}
