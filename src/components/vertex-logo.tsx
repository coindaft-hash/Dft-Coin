export function VertexMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="vertexGrad" x1="3" y1="3" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34cc9b" />
          <stop offset="1" stopColor="#09c48d" />
        </linearGradient>
      </defs>
      <path d="M3 7h7l6 13 6-13h7L16 30 3 7Z" fill="url(#vertexGrad)" />
      <path d="m12 3 4 8 4-8h-8Z" fill="#34cc9b" opacity="0.9" />
    </svg>
  );
}

export function VertexLogo({
  className = "",
  withText = true,
}: {
  className?: string;
  withText?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="grid size-9 place-items-center rounded-[10px] bg-[#111b27] border border-[#1d2a38]/60 shadow-sm">
        <VertexMark className="size-5" />
      </div>
      {withText && (
        <span className="font-bold tracking-tight text-white text-base">
          VERTEX<span className="text-[#34cc9b]">.</span>
        </span>
      )}
    </div>
  );
}
