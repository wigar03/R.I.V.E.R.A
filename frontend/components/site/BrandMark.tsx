export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#1c5a3b" />
      <path d="M32 12c7 9 13 16 13 24a13 13 0 0 1-26 0c0-8 6-15 13-24z" fill="#36c2bb" />
      <path d="M26 38c1.5 4 4 6 8 6.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
