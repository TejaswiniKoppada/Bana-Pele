import './Loader.css';

/** Generic centered spinner — purely visual, no business logic. */
export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader">
      <div className="loader__spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
