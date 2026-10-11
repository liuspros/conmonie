'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/utils';
import { loadFace, detect, dist } from '@/lib/face';
import { FACE_MAX, STATEMENT_MAX_DAYS } from '@/lib/limits';
import { readStatement, parseStatement, nameMatches } from '@/lib/statement';
import { checkPost, normalizePhone } from '@/lib/social';
import { AGREEMENT } from '@/lib/agreement';
import Liveness from '@/components/Liveness';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

const TITLES = ['Your details', 'Social proof', 'Your ID', 'Live selfie', 'Bank statement', 'Agreement'];
const KEY = 'conmonie-onb';
const EDITORS = /photoshop|canva|ilovepdf|smallpdf|sejda|pdfescape|pdf24|illustrator|inkscape|wps|foxit.*editor/i;
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const Check = ({ ok, children, fix, onFix }) => (
  <div className="r" style={{ fontSize: 14 }}>
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className={'ibadge ' + (ok ? 'ok' : 'rej')} style={{ width: 24, height: 24 }}><Icon n={ok ? 'check' : 'x'} s={14} /></span>{children}</span>
    {!ok && <button className="pill" style={{ background: '#E3E5E8', height: 28 }} onClick={onFix}>{fix}</button>}
  </div>);

export default function Onboarding() {
  const { user, profile } = useRequireAuth(), r = useRouter(), scroller = useRef(null);
  const [ready, setReady] = useState(false), [step, setStep] = useState(0), [name, setName] = useState(''), [wa, setWa] = useState(''), [pUrl, setPUrl] = useState(''), [postUrl, setPostUrl] = useState('');
  const [id, setId] = useState(null), [live, setLive] = useState(null), [stmt, setStmt] = useState(null), [read, setRead] = useState(false), [agree, setAgree] = useState(false), [signed, setSigned] = useState('');
  const [busy, setBusy] = useState(''), [err, setErr] = useState(''), [reasons, setReasons] = useState([]), [done, setDone] = useState(false);

  useEffect(() => { // restore an unfinished attempt (it survives locking the app or a reload)
    try { const d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (d) { setStep(d.step || 0); setName(d.name || ''); setWa(d.wa || ''); setPUrl(d.pUrl || ''); setPostUrl(d.postUrl || ''); setId(d.id || null); setLive(d.live || null); setStmt(d.stmt || null); } } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (user && !wa && user.phoneNumber) setWa(user.phoneNumber); }, [user]);
  useEffect(() => { if (ready && !done) try { sessionStorage.setItem(KEY, JSON.stringify({ step, name, wa, pUrl, postUrl, id: id && !id.scanning ? id : null, live, stmt })); } catch {} }, [ready, done, step, name, wa, pUrl, postUrl, id, live, stmt]);
  useEffect(() => { if (profile?.verified && !done) r.replace('/'); }, [profile]);
  useEffect(() => { if (step >= 1) loadFace().catch(() => {}); }, [step]); // warm up the face tools while the person fills in earlier steps

  const soc = pUrl && postUrl ? checkPost(pUrl, postUrl) : null;
  const distance = id?.descriptor && live?.descriptor ? dist(id.descriptor, live.descriptor) : null;
  const C = {
    phone: !!normalizePhone(wa), social: !!(soc && soc.ok), face: distance != null && distance <= FACE_MAX, live: !!live?.liveness,
    pdf: !!stmt?.isPdf, name: !!stmt?.name && nameMatches(stmt.name, name), address: !!stmt?.address,
    recent: stmt?.ageDays != null && stmt.ageDays <= STATEMENT_MAX_DAYS && stmt.ageDays >= -1, clean: !EDITORS.test((stmt?.producer || '') + ' ' + (stmt?.creator || '')),
  };
  const allOk = Object.values(C).every(Boolean);

  async function onId(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setErr(''); setId(null);
    try {
      const img = await compressImage(file, 1000); setId({ img, descriptor: null, scanning: true });
      const f = await loadFace(), det = await detect(f, await loadImg(img), 608);
      if (!det) throw new Error('face');
      setId({ img, descriptor: Array.from(det.descriptor) });
    } catch (x) { setId(null); setErr(x.message === 'face' ? 'We could not find a clear face on the ID. Lay it flat in good light, with the photo sharp and no glare.' : 'Could not read that image. Try another photo.'); }
  }
  async function onStmt(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setErr(''); setStmt(null); setBusy('Reading your statement...');
    try { const x = await readStatement(file); setStmt(x.isPdf ? { ...x, ...parseStatement(x.lines) } : { isPdf: false, page: await compressImage(file, 1000) }); }
    catch { setErr('Could not read that file. Upload the PDF statement from your bank app.'); }
    setBusy('');
  }
  async function submit() {
    setErr(''); setReasons([]); setBusy('Verifying your details...');
    try {
      await api('/api/onboarding/submit', { legalName: name.trim(), whatsapp: wa, social: { profileUrl: pUrl, postUrl }, selfie: live.selfie, id: id.img, stmt: stmt.page, scores: { distance, liveness: C.live }, statement: { name: stmt.name, address: stmt.address, date: stmt.date, isPdf: stmt.isPdf, producer: stmt.producer, creator: stmt.creator }, agree: true, signedName: signed });
      try { sessionStorage.removeItem(KEY); } catch {}
      setDone(true);
    } catch (x) { if (x.data?.reasons) setReasons(x.data.reasons); else setErr('Could not send. Check your connection and try again.'); }
    setBusy('');
  }
  if (!ready) return <main className="app"><Loader label="Loading..." /></main>;
  if (done) return (
    <main className="app" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 16 }}>
      <img src="/3d/badge.png" width="180" height="180" alt="" /><h1 style={{ fontSize: 28, fontWeight: 700 }}>You are verified</h1>
      <p className="m" style={{ maxWidth: 290, lineHeight: 1.5 }}>Welcome to Conmonie. You can now join and create Ajo groups.</p>
      <button className="btn" onClick={() => r.replace('/')}>Continue</button>
    </main>);

  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <div><span className="m">Step {step + 1} of 6</span><h1 style={{ fontSize: 26, fontWeight: 700 }}>{TITLES[step]}</h1><div className="bar"><span style={{ width: ((step + 1) / 6) * 100 + '%', background: '#C8F135' }} /></div></div>
      {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}

      {step === 0 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Everyone on Conmonie is identity-checked before joining an Ajo. It protects every member&apos;s money. Start with your details.</p>
        <input className="inp" placeholder="Full legal name (as on your ID)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <input className="inp" type="tel" inputMode="tel" placeholder="WhatsApp number, e.g. 0801 234 5678" value={wa} onChange={(e) => setWa(e.target.value)} autoComplete="tel" />
        <button className="btn" disabled={name.trim().split(/\s+/).length < 2 || !C.phone} onClick={() => setStep(1)}>Next</button>
      </>}

      {step === 1 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Show us you are a real, active person. Paste the link to your profile and the link to <b>one post you made in the last 30 days</b>. We support X, Instagram, TikTok and LinkedIn.</p>
        <input className="inp" inputMode="url" placeholder="Your profile link, e.g. https://instagram.com/yourname" value={pUrl} onChange={(e) => setPUrl(e.target.value)} />
        <input className="inp" inputMode="url" placeholder="Link to a recent post of yours" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} />
        {soc && <div className="glass" style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}><span className={'ibadge ' + (soc.ok ? 'ok' : 'rej')} style={{ width: 32, height: 32 }}><Icon n={soc.ok ? 'check' : 'x'} s={16} /></span>{soc.ok ? <span>Post found on {soc.data.platform}, made {soc.data.daysAgo === 0 ? 'today' : soc.data.daysAgo + ' day(s) ago'}.</span> : <span>{soc.reason}</span>}</div>}
        <div className="m" style={{ fontSize: 12, lineHeight: 1.5 }}>To copy a post link: open the post, tap Share, then Copy link.</div>
        <button className="btn" disabled={!C.social} onClick={() => setStep(2)}>Next</button>
      </>}

      {step === 2 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Take or upload a clear photo of your ID (NIN slip or card, driver&apos;s licence, voter&apos;s card or passport) with your face photo visible.</p>
        <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="camera" />{id ? 'Choose a different photo' : 'Upload ID photo'}<input type="file" accept="image/*" capture="environment" onChange={onId} style={{ display: 'none' }} /></label>
        {id && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div className={id.scanning ? 'scanbox' : ''}><img src={id.img} alt="Your ID" style={{ width: '100%', maxWidth: 300, borderRadius: 14, display: 'block' }} /></div>
          {id.scanning ? <Loader inline size={28} label="Checking your ID photo for a face..." /> : <b style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="ibadge ok" style={{ width: 28, height: 28 }}><Icon n="check" s={16} /></span>Face found on ID</b>}
        </div>}
        <button className="btn" disabled={!id || id.scanning || !id.descriptor} onClick={() => setStep(3)}>Next</button>
      </>}

      {step === 3 && (live
        ? <><div className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><img src={live.selfie} alt="Your selfie" style={{ width: 90, borderRadius: 12 }} /><b>Live check complete</b></div>
            {distance != null && !C.face && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>Your face did not match your ID photo closely enough. Retake the ID photo closer and the selfie in bright light.</p>}
            <button className="btn" disabled={!C.face} onClick={() => setStep(4)}>Next</button>
            <button className="btn2" onClick={() => setLive(null)}>Redo selfie</button></>
        : <Liveness onDone={setLive} />)}

      {step === 4 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Download a recent PDF statement from your banking app (last 3 months) and upload it. Your name and home address must show on the first page. Do not edit the file. We read only the first page.</p>
        <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="doc" />{stmt ? 'Choose a different file' : 'Upload PDF statement'}<input type="file" accept="application/pdf" onChange={onStmt} style={{ display: 'none' }} /></label>
        {busy && <Loader label={busy} />}
        {stmt && <div className="glass" style={{ fontSize: 14, lineHeight: 1.7 }}>{stmt.isPdf ? <>Account name: <b>{stmt.name || 'not found'}</b><br />Address: <b>{stmt.address || 'not found'}</b><br />Statement date: <b>{stmt.date || 'not found'}</b></> : 'That is an image. Please upload the PDF statement.'}</div>}
        <button className="btn" disabled={!stmt?.isPdf} onClick={() => setStep(5)}>Next</button>
      </>}

      {step === 5 && <>
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Your checks</b>
          <Check ok={C.phone} fix="Fix" onFix={() => setStep(0)}>WhatsApp number</Check><Check ok={C.social} fix="Fix" onFix={() => setStep(1)}>Recent social post</Check>
          <Check ok={C.face} fix="Redo" onFix={() => setStep(2)}>Face matches your ID</Check><Check ok={C.live} fix="Redo" onFix={() => { setLive(null); setStep(3); }}>Live check</Check>
          <Check ok={C.pdf && C.name} fix="Fix" onFix={() => setStep(4)}>Statement name matches</Check><Check ok={C.address} fix="Fix" onFix={() => setStep(4)}>Address on statement</Check>
          <Check ok={C.recent && C.clean} fix="Fix" onFix={() => setStep(4)}>Recent, unedited statement</Check>
        </div>
        <b>Member agreement</b>
        <div ref={scroller} onScroll={(e) => { const t = e.currentTarget; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 24) setRead(true); }} tabIndex={0} aria-label="Member agreement" className="glass" style={{ height: 340, overflowY: 'auto', fontSize: 14, lineHeight: 1.65 }}>
          {AGREEMENT.map((s) => <div key={s.t} style={{ marginBottom: 14 }}><b style={{ fontSize: 15 }}>{s.t}</b>{s.p.map((p, i) => <p key={i} style={{ marginTop: 6 }}>{p}</p>)}</div>)}
        </div>
        {!read && <p className="m" style={{ fontSize: 12 }}>Scroll to the end of the agreement to continue.</p>}
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, opacity: read ? 1 : 0.5 }}><input type="checkbox" disabled={!read} checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />I have read and understood this agreement. I agree that the information I submitted can be used to report me to the group admin, the police or other lawful authorities if I take a payout and refuse to pay, or use false information.</label>
        <input className="inp" placeholder="Type your full legal name to sign" value={signed} onChange={(e) => setSigned(e.target.value)} disabled={!agree} />
        {busy && <Loader label={busy} />}
        {reasons.length > 0 && <div className="glass" role="alert"><b>We could not verify you yet</b><ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>{reasons.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        <button className="btn" disabled={!allOk || !agree || !nameMatches(signed, name) || !!busy} onClick={submit}>Sign and finish</button>
      </>}

      <div className="r" style={{ marginTop: 8 }}>
        {step > 0 && !busy ? <button className="pill" style={{ background: '#E3E5E8' }} onClick={() => { setErr(''); setStep(step - 1); }}><Icon n="back" s={16} />&nbsp;Back</button> : <span />}
        <button className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={() => { try { sessionStorage.removeItem(KEY); } catch {} signOut(auth); }}>Log out</button>
      </div>
    </main>
  );
}
