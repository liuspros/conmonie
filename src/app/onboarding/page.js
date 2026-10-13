'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, RecaptchaVerifier, linkWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/utils';
import { loadFace, detect, dist } from '@/lib/face';
import { FACE_MAX, STATEMENT_MAX_DAYS, ALLOW_TYPED_ADDRESS } from '@/lib/limits';
import { readStatement, parseStatement, nameMatches } from '@/lib/statement';
import { normalizePhone } from '@/lib/phone';
import { AGREEMENT } from '@/lib/agreement';
import Liveness from '@/components/Liveness';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

const TITLES = ['Your details', 'Your ID', 'Live selfie', 'Bank statement', 'Agreement'];
const RELS = ['Parent', 'Sibling', 'Spouse or partner', 'Friend', 'Colleague or employer', 'Other relative', 'Other'];
const KEY = 'conmonie-onb';
const EDITORS = /photoshop|canva|ilovepdf|smallpdf|sejda|pdfescape|pdf24|illustrator|inkscape|wps|foxit.*editor/i;
const MSG = { 'auth/invalid-phone-number': 'Check the phone number and try again.', 'auth/invalid-verification-code': 'That code is wrong.', 'auth/code-expired': 'That code expired. Ask for a new one.', 'auth/too-many-requests': 'Too many tries. Wait a few minutes.', 'auth/credential-already-in-use': 'This phone number is already used by another Conmonie account.', 'auth/provider-already-linked': 'A phone number is already linked to this account.', 'auth/requires-recent-login': 'For safety, log out and log in again, then retry.', 'auth/operation-not-allowed': 'Phone verification is not switched on in Firebase yet.' };
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const Check = ({ ok, children, fix, onFix }) => (
  <div className="r" style={{ fontSize: 14 }}>
    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className={'ibadge ' + (ok ? 'ok' : 'rej')} style={{ width: 24, height: 24 }}><Icon n={ok ? 'check' : 'x'} s={14} /></span>{children}</span>
    {!ok && <button className="pill" style={{ background: '#E3E5E8', height: 28 }} onClick={onFix}>{fix}</button>}
  </div>);

export default function Onboarding() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [ready, setReady] = useState(false), [step, setStep] = useState(0), [name, setName] = useState(''), [phone, setPhone] = useState(''), [code, setCode] = useState(''), [conf, setConf] = useState(null), [vPhone, setVPhone] = useState('');
  const [waSame, setWaSame] = useState(true), [wa, setWa] = useState(''), [tcName, setTcName] = useState(''), [tcPhone, setTcPhone] = useState(''), [tcRel, setTcRel] = useState('Parent');
  const [id, setId] = useState(null), [live, setLive] = useState(null), [stmt, setStmt] = useState(null), [addr, setAddr] = useState('');
  const [read, setRead] = useState(false), [agree, setAgree] = useState(false), [signed, setSigned] = useState('');
  const [busy, setBusy] = useState(''), [err, setErr] = useState(''), [reasons, setReasons] = useState([]), [done, setDone] = useState(false);

  useEffect(() => { // restore an unfinished attempt (it survives locking the app or a reload)
    try { const d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (d) { setStep(d.step || 0); setName(d.name || ''); setPhone(d.phone || ''); setWaSame(d.waSame !== false); setWa(d.wa || ''); setTcName(d.tcName || ''); setTcPhone(d.tcPhone || ''); setTcRel(d.tcRel || 'Parent'); setId(d.id || null); setLive(d.live || null); setStmt(d.stmt || null); setAddr(d.addr || ''); } } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (user && user.phoneNumber) setVPhone(user.phoneNumber); }, [user]);
  useEffect(() => { if (ready && !done) try { sessionStorage.setItem(KEY, JSON.stringify({ step, name, phone, waSame, wa, tcName, tcPhone, tcRel, id: id && !id.scanning ? id : null, live, stmt, addr })); } catch {} }, [ready, done, step, name, phone, waSame, wa, tcName, tcPhone, tcRel, id, live, stmt, addr]);
  useEffect(() => { if (profile?.verified && !done) r.replace('/'); }, [profile]);
  useEffect(() => { if (step >= 1) loadFace().catch(() => {}); }, [step]); // warm up the face tools

  const ps = useMemo(() => (stmt && stmt.rows ? parseStatement(stmt.rows, { expectedName: name }) : null), [stmt, name]);
  useEffect(() => { if (ps && ps.addressGuess && !addr) setAddr(ps.address); }, [ps && ps.address]);
  const waNum = waSame ? vPhone : normalizePhone(wa) || '', tcP = normalizePhone(tcPhone);
  const stmtAddr = ps && ps.address && !ps.addressGuess ? ps.address : '', address = (addr.trim() || stmtAddr).trim(), addrSource = stmtAddr && (!addr.trim() || addr.trim() === stmtAddr) ? 'statement' : 'typed';
  const distance = id?.descriptor && live?.descriptor ? dist(id.descriptor, live.descriptor) : null;
  const C = {
    phone: !!vPhone, wa: !!normalizePhone(waNum), contact: tcName.trim().length >= 3 && !!tcP && tcP !== vPhone,
    face: distance != null && distance <= FACE_MAX, live: !!live?.liveness,
    pdf: !!stmt?.isPdf, name: !!ps?.nameFound, address: address.length >= 8 && (addrSource === 'statement' || ALLOW_TYPED_ADDRESS),
    recent: ps?.ageDays != null && ps.ageDays <= STATEMENT_MAX_DAYS && ps.ageDays >= -1, clean: !EDITORS.test((stmt?.producer || '') + ' ' + (stmt?.creator || '')),
  };
  const allOk = Object.values(C).every(Boolean);

  async function sendCode() {
    setErr(''); const n = normalizePhone(phone); if (!n) return setErr('Enter a valid phone number, for example 0801 234 5678.');
    setBusy('Sending your code...');
    try { window.__rc2 = window.__rc2 || new RecaptchaVerifier(auth, 'rc2', { size: 'invisible' }); setConf(await linkWithPhoneNumber(auth.currentUser, n, window.__rc2)); }
    catch (e) { try { window.__rc2 && window.__rc2.clear(); } catch {} window.__rc2 = null; setErr(MSG[e.code] || 'Could not send the code. Check the number and your network.'); }
    setBusy('');
  }
  async function confirmCode() {
    setErr(''); setBusy('Checking the code...');
    try { await conf.confirm(code.trim()); await auth.currentUser.reload(); setVPhone(auth.currentUser.phoneNumber || ''); setConf(null); setCode(''); }
    catch (e) { setErr(MSG[e.code] || 'Could not confirm that code.'); }
    setBusy('');
  }
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
    setErr(''); setStmt(null); setAddr(''); setBusy('Reading your statement...');
    try { const x = await readStatement(file); if (x.isPdf && !x.rows.length) setErr('That PDF looks like a picture or scan. Download the statement directly from your bank app.'); else setStmt(x.isPdf ? x : { isPdf: false }); }
    catch { setErr('Could not read that file. Upload the PDF statement from your bank app.'); }
    setBusy('');
  }
  async function submit() {
    setErr(''); setReasons([]); setBusy('Verifying your details...');
    try {
      await api('/api/onboarding/submit', { legalName: name.trim(), whatsapp: waNum, trustedContact: { name: tcName.trim(), phone: tcPhone, relation: tcRel }, selfie: live.selfie, id: id.img, stmt: stmt.page, scores: { distance, liveness: C.live }, statement: { name: ps.name, address, addressSource: addrSource, date: ps.date, isPdf: true, producer: stmt.producer, creator: stmt.creator }, agree: true, signedName: signed });
      try { sessionStorage.removeItem(KEY); } catch {}
      setDone(true);
    } catch (x) { if (x.data?.reasons) setReasons(x.data.reasons); else setErr('Could not send. Check your connection and try again.'); }
    setBusy('');
  }
  if (!ready) return <main className="app"><Loader label="Loading..." /></main>;
  if (done) return (
    <main className="app" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 16 }}>
      <img src="/3d/badge.png" width="180" height="180" alt="" /><h1 style={{ fontSize: 28, fontWeight: 700 }}>You are verified</h1>
      <p className="m" style={{ maxWidth: 290, lineHeight: 1.5 }}>Welcome to Conmonie. You can now join and create Ajos and ConGoals.</p>
      <button className="btn" onClick={() => r.replace('/')}>Continue</button>
    </main>);

  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <div><span className="m">Step {step + 1} of 5</span><h1 style={{ fontSize: 26, fontWeight: 700 }}>{TITLES[step]}</h1><div className="bar"><span style={{ width: ((step + 1) / 5) * 100 + '%', background: '#C8F135' }} /></div></div>
      {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}

      {step === 0 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Everyone on Conmonie is identity-checked before saving with others. It protects every member&apos;s money.</p>
        <input className="inp" placeholder="Full legal name (as on your ID)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Your phone number</b>
          {vPhone ? <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15 }}><span className="ibadge ok" style={{ width: 28, height: 28 }}><Icon n="check" s={16} /></span>Verified: {vPhone}</div>
            : conf ? <><p className="m" style={{ fontSize: 13 }}>We sent a 6-digit code to {phone}.</p><input className="inp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn" style={{ height: 44 }} disabled={code.trim().length < 6 || !!busy} onClick={confirmCode}>Verify code</button></>
            : <><p className="m" style={{ fontSize: 13 }}>We send you a code to make sure the number is really yours.</p><input className="inp" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 0801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} /><button className="btn2" style={{ height: 44 }} disabled={!!busy} onClick={sendCode}>Send code</button></>}
          {busy && <Loader inline size={26} label={busy} />}
        </div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={waSame} onChange={(e) => setWaSame(e.target.checked)} style={{ width: 22, height: 22 }} />My WhatsApp number is the same number</label>
        {!waSame && <input className="inp" type="tel" inputMode="tel" placeholder="WhatsApp number" value={wa} onChange={(e) => setWa(e.target.value)} />}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>A trusted contact</b><p className="m" style={{ fontSize: 13, lineHeight: 1.5 }}>Someone who knows you, such as a parent, sibling or friend. They are only contacted to reach you if you stop responding in a default case. Use a different number from yours.</p>
          <input className="inp" placeholder="Their full name" value={tcName} onChange={(e) => setTcName(e.target.value)} />
          <input className="inp" type="tel" inputMode="tel" placeholder="Their phone number" value={tcPhone} onChange={(e) => setTcPhone(e.target.value)} />
          <select className="inp" value={tcRel} onChange={(e) => setTcRel(e.target.value)} aria-label="Relationship">{RELS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <button className="btn" disabled={name.trim().split(/\s+/).length < 2 || !C.phone || !C.wa || !C.contact} onClick={() => setStep(1)}>Next</button>
      </>}

      {step === 1 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Take or upload a clear photo of your ID (NIN slip or card, driver&apos;s licence, voter&apos;s card or passport) with your face photo visible.</p>
        <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="camera" />{id ? 'Choose a different photo' : 'Upload ID photo'}<input type="file" accept="image/*" capture="environment" onChange={onId} style={{ display: 'none' }} /></label>
        {id && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div className={id.scanning ? 'scanbox' : ''}><img src={id.img} alt="Your ID" style={{ width: '100%', maxWidth: 300, borderRadius: 14, display: 'block' }} /></div>
          {id.scanning ? <Loader inline size={30} label="Checking your ID photo for a face..." /> : <b style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="ibadge ok" style={{ width: 28, height: 28 }}><Icon n="check" s={16} /></span>Face found on ID</b>}
        </div>}
        <button className="btn" disabled={!id || id.scanning || !id.descriptor} onClick={() => setStep(2)}>Next</button>
      </>}

      {step === 2 && (live
        ? <><div className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><img src={live.selfie} alt="Your selfie" style={{ width: 90, borderRadius: 12 }} /><b>Live check complete</b></div>
            {distance != null && !C.face && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>Your face did not match your ID photo closely enough. Retake the ID photo closer and the selfie in bright light.</p>}
            <button className="btn" disabled={!C.face} onClick={() => setStep(3)}>Next</button>
            <button className="btn2" onClick={() => setLive(null)}>Redo selfie</button></>
        : <Liveness onDone={setLive} />)}

      {step === 3 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Download a recent PDF statement from your banking app (last 3 months) and upload it. Do not edit the file. We read only the first page, and we find your name, address and date wherever your bank puts them.</p>
        <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="doc" />{stmt ? 'Choose a different file' : 'Upload PDF statement'}<input type="file" accept="application/pdf" onChange={onStmt} style={{ display: 'none' }} /></label>
        {busy && <Loader label={busy} />}
        {stmt && !stmt.isPdf && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>That is an image. Please upload the PDF statement.</p>}
        {ps && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          <b>What we read</b>
          <div className="r"><span>Your name</span><span className={'st ' + (ps.nameFound ? 'st-ok' : 'st-rej')}>{ps.nameFound ? 'Found' : 'Not found'}</span></div>
          <div className="r"><span>Statement date</span><span className={'st ' + (C.recent ? 'st-ok' : 'st-rej')}>{ps.date ? ps.date : 'Not found'}</span></div>
          {!ps.nameFound && <p className="m" style={{ fontSize: 13, lineHeight: 1.5 }}>We could not see &ldquo;{name}&rdquo; at the top of the statement. The name must match the legal name you entered in step 1.</p>}
          {stmtAddr
            ? <div><div className="m" style={{ fontSize: 12 }}>Address on the statement</div><b>{stmtAddr}</b></div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div className="m" style={{ fontSize: 13, lineHeight: 1.5 }}>{ps.addressGuess ? 'We found this address. Check it and correct it if needed.' : 'We did not find a home address on this statement. Type your home address.'}</div><textarea className="inp" style={{ height: 80, padding: 12 }} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="House number, street, area, city and state" aria-label="Home address" />{!ALLOW_TYPED_ADDRESS && <p role="alert" className="m" style={{ fontSize: 13 }}>The address must be printed on your statement. Try a statement that shows it.</p>}</div>}
        </div>}
        <button className="btn" disabled={!C.pdf || !C.name || !C.recent || !C.address} onClick={() => setStep(4)}>Next</button>
      </>}

      {step === 4 && <>
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Your checks</b>
          <Check ok={C.phone && C.wa} fix="Fix" onFix={() => setStep(0)}>Phone and WhatsApp numbers</Check><Check ok={C.contact} fix="Fix" onFix={() => setStep(0)}>Trusted contact</Check>
          <Check ok={C.face} fix="Redo" onFix={() => setStep(1)}>Face matches your ID</Check><Check ok={C.live} fix="Redo" onFix={() => { setLive(null); setStep(2); }}>Live check</Check>
          <Check ok={C.pdf && C.name} fix="Fix" onFix={() => setStep(3)}>Statement name matches</Check><Check ok={C.address} fix="Fix" onFix={() => setStep(3)}>Home address</Check>
          <Check ok={C.recent && C.clean} fix="Fix" onFix={() => setStep(3)}>Recent, unedited statement</Check>
        </div>
        <b>Member agreement</b>
        <div onScroll={(e) => { const t = e.currentTarget; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 24) setRead(true); }} data-noptr tabIndex={0} aria-label="Member agreement" className="glass" style={{ height: 340, overflowY: 'auto', fontSize: 14, lineHeight: 1.65 }}>
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
      <div id="rc2" />
    </main>
  );
}
