export default function Skeleton({ n = 3, h = 72 }) {
  return <>{Array.from({ length: n }).map((_, i) => <div key={i} className="sk" style={{ height: h }} />)}</>;
}
