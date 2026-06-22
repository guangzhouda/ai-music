export function EmptyState(props: { text: string }) {
  return (
    <div className="empty-state" role="status">
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.5, margin: "0 auto 0.6rem", display: "block" }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8 15s1.5-2 4-2 4 2 4 2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
      {props.text}
    </div>
  );
}
