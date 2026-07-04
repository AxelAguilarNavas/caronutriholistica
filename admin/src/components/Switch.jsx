export default function Switch({ on, onToggle, blue = false }) {
  return (
    <button
      type="button"
      className={`switch${on ? ' on' : ''}${blue ? ' blue' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
    >
      <div className="switch-thumb" />
    </button>
  );
}
