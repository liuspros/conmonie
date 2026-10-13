// Loader: a soft grey track, a lemon-to-black comet arc that spins, and the Conmonie ring-and-dot mark pulsing in the middle.
export default function Loader({ label, size = 56, inline }) {
  return (
    <div role="status" aria-live="polite" className={'ldw' + (inline ? ' inl' : '')}>
      <span className="ldb" style={{ '--s': size + 'px', '--w': Math.max(3, Math.round(size * 0.11)) + 'px' }} aria-hidden="true">
        <i className="ldt" /><i className="lda" />
        <svg className="ldl" viewBox="0 0 40 40"><circle cx="20" cy="21" r="8.5" fill="none" stroke="#0A0A0A" strokeWidth="3.4" /><circle cx="20" cy="12.5" r="3.2" fill="#C8F135" stroke="#0A0A0A" strokeWidth="1.5" /></svg>
      </span>
      {label && <span className="ldx">{label}</span>}
    </div>
  );
}
