'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/utils';
import { loadFace, detect, dist } from '@/lib/face';
import { readStatement, parseStatement, nameMatches } from '@/lib/statement';
import Liveness from '@/components/Liveness';

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const EDITORS = /photoshop|canva|ilovepdf|smallpdf|sejda|pdfescape|pdf24|illustrator|inkscape|wps|foxit.*editor/i;
const Row = ({ ok, children }) => <div className="r" style={{ fontSize: 14 }}><span>{children}</span><span className={'tag' + (ok ? ' k' : '')}>{ok ? 'OK' : 'Needs review'}</span></div>;

export default function Verify() {
  const { profile } = useRequireAuth();
  const [step, setStep] = useState(0), [name, setName] = useState(''), [ok, setOk] = useState(false), [id, setId] = useState(null), [live, setLive] = useState(null), [stmt, setStmt] = useState(null), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [sent, setSent] = useState(false);

  async function onId(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setErr(''); setBusy('Checking your ID photo...');
    try {
      const f = await loadFace(), img = await compressImage(file, 1000), det = await detect(f, await loadImg(img), 608);
      if (!det) throw new Error('face');
      setId({ img, descriptor: Array.from(det.descriptor) });
    } catch (x) { setErr(x.message === 'face' ? 'We could not find a clear face on the ID. Lay it flat in good light with the photo sharp and no glare.' : 'Could not read that image. Try another photo.'); }
    setBusy('');
  }
  async function onStmt(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setErr(''); setBusy('Reading your statement...');
    try {
      const r = await readStatement(file);
      setStmt(r.isPdf ? { ...r, ...parseStatement(r.lines) } : { isPdf: false, page: await compressImage(file, 1000) });
    } catch { setErr('Could not read that file. Upload the PDF statement from your bank app.'); }
    setBusy('');
  }
  const checks = () => {
    const distance = id && live ? dist(id.descriptor, live.descriptor) : null;
    return { distance,
      face: distance != null && distance <= 0.5, live: !!live?.liveness, pdf: !!stmt?.isPdf,
      name: !!stmt?.name && nameMatches(stmt.name, name), address: !!stmt?.address,
      recent: stmt?.ageDays != null && stmt.ageDays <= 100 && stmt.ageDays >= -1, clean: !EDITORS.test((stmt?.producer || '') + ' ' + (stmt?.creator || '')) };
  };
  async function submit() {
    const c = checks(); setBusy('Sending...'); setErr('');
    const flags = [];
    if (!c.face) flags.push(c.distance != null && c.distance > 0.6 ? 'face does not match the ID' : 'face match is borderline');
    if (!c.live) flags.push('liveness challenges not completed');
    if (!c.pdf) flags.push('statement is an image, not a PDF');
    if (c.pdf && !c.name) flags.push('statement name differs from the legal name');
    if (c.pdf && !c.address) flags.push('no address found on the statement');
    if (c.pdf && !c.recent) flags.push('statement date missing or older than 100 days');
    if (!c.clean) flags.push('PDF was produced by an editing tool');
    try {
      await api('/api/verify/submit', { legalName: name, selfie: live.selfie, id: id.img, stmt: stmt.page, flags, scores: { distance: c.distance, liveness: c.live }, statement: { name: stmt.name, address: stmt.address, date: stmt.date, isPdf: stmt.isPdf, producer: stmt.producer } });
      setSent(true);
    } catch (e) { setErr(e.status === 409 ? 'You already have a check in progress.' : 'Could not send. Check your connection and try again.'); }
    setBusy('');
  }

  const s = profile?.verifyStatus;
  if (s === 'verified' || s === 'pending' || sent) return (
    <main className="app" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>{s === 'verified' ? 'You are verified' : 'Under review'}</h1>
      <p className="m" style={{ maxWidth: 290, lineHeight: 1.5 }}>{s === 'verified' ? 'The Verified badge shows next to your name in groups.' : 'Thanks. Our team will review your documents and you will get a notification. Your images are deleted after the review.'}</p>
      <Link href="/me" className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back to Me</Link>
    </main>);

  const c = checks(), titles = ['Before you start', 'Your ID', 'Live selfie', 'Bank statement', 'Review'];
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href="/me" style={{ color: 'inherit', textDecoration: 'none' }}>&lsaquo; Back</Link>
      <div><span className="m">Step {step + 1} of 5</span><h1 style={{ fontSize: 26, fontWeight: 700 }}>{titles[step]}</h1></div>
      {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
      {busy && <p role="status" className="m">{busy}</p>}

      {step === 0 && <>
        <div className="glass" style={{ fontSize: 14, lineHeight: 1.6 }}>We will check that a live face matches your ID photo and that your bank statement shows your name and address. This helps groups trust each other.
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>Face matching happens on your phone. Only one small selfie is sent.</li>
            <li>We read only the first page of your statement and send only that page.</li>
            <li>Your group admin never sees any of this. A Conmonie reviewer sees it once, then the images are deleted.</li>
            <li>We keep your name, the result, and the address read from the statement.</li>
          </ul></div>
        <input className="inp" placeholder="Full legal name (as on your ID)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />I agree to Conmonie processing my face image, ID and bank statement for this check.</label>
        <button className="btn" disabled={!ok || name.trim().split(/\s+/).length < 2} onClick={() => setStep(1)}>Start</button>
      </>}

      {step === 1 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Take or upload a clear photo of your ID card (NIN slip or card, driver&apos;s licence, voter&apos;s card or international passport) with the face photo visible.</p>
        <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{id ? 'Choose a different photo' : 'Upload ID photo'}<input type="file" accept="image/*" capture="environment" onChange={onId} style={{ display: 'none' }} /></label>
        {id && <div className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><img src={id.img} alt="Your ID" style={{ width: 90, borderRadius: 10 }} /><b>Face found on ID</b></div>}
        <button className="btn" disabled={!id} onClick={() => setStep(2)}>Next</button>
      </>}

      {step === 2 && (live
        ? <><div className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><img src={live.selfie} alt="Your selfie" style={{ width: 90, borderRadius: 10 }} /><b>{live.liveness ? 'Live check complete' : 'Sent for manual review'}</b></div>
            <button className="btn" onClick={() => setStep(3)}>Next</button>
            <button className="btn2" onClick={() => setLive(null)}>Redo</button></>
        : <Liveness onDone={setLive} />)}

      {step === 3 && <>
        <p className="m" style={{ lineHeight: 1.5 }}>Download a recent PDF statement from your banking app (last 3 months) and upload it. Make sure your name and address show on the first page. Do not edit the file.</p>
        <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{stmt ? 'Choose a different file' : 'Upload PDF statement'}<input type="file" accept="application/pdf,image/*" onChange={onStmt} style={{ display: 'none' }} /></label>
        {stmt && <div className="glass" style={{ fontSize: 14, lineHeight: 1.6 }}>{stmt.isPdf ? <>Account name: <b>{stmt.name || 'not found'}</b><br />Address: <b>{stmt.address || 'not found'}</b><br />Statement date: <b>{stmt.date || 'not found'}</b></> : 'This is an image, so it will go to a person for review. A PDF is faster.'}</div>}
        <button className="btn" disabled={!stmt} onClick={() => setStep(4)}>Next</button>
      </>}

      {step === 4 && <>
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row ok={c.face}>Face matches your ID</Row><Row ok={c.live}>Live check passed</Row><Row ok={c.pdf}>PDF statement</Row>
          <Row ok={c.name}>Statement name matches</Row><Row ok={c.address}>Address found</Row><Row ok={c.recent}>Statement is recent</Row><Row ok={c.clean}>No editing tool detected</Row>
        </div>
        <p className="m" style={{ lineHeight: 1.5 }}>These are automatic checks. A Conmonie reviewer makes the final decision, so items marked &quot;Needs review&quot; will not necessarily be refused.</p>
        <button className="btn" disabled={!!busy} onClick={submit}>Submit for review</button>
      </>}
    </main>
  );
}
