export function HolographicGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #14b8a6 1px, transparent 1px),
            linear-gradient(to bottom, #14b8a6 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0">
        <div
          className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-teal-400/15 to-transparent"
          style={{ transform: "skewX(-15deg)" }}
        />
        <div
          className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-teal-400/15 to-transparent"
          style={{ transform: "skewX(15deg)" }}
        />
      </div>
      <div className="absolute top-0 left-0 w-32 h-32">
        <div className="absolute top-4 left-4 w-8 h-px bg-cyan-400/40" />
        <div className="absolute top-4 left-4 w-px h-8 bg-cyan-400/40" />
      </div>
      <div className="absolute top-0 right-0 w-32 h-32">
        <div className="absolute top-4 right-4 w-8 h-px bg-cyan-400/40" />
        <div className="absolute top-4 right-4 w-px h-8 bg-cyan-400/40" />
      </div>
      <div className="absolute bottom-0 left-0 w-32 h-32">
        <div className="absolute bottom-4 left-4 w-8 h-px bg-cyan-400/40" />
        <div className="absolute bottom-4 left-4 w-px h-8 bg-cyan-400/40" />
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-32">
        <div className="absolute bottom-4 right-4 w-8 h-px bg-cyan-400/40" />
        <div className="absolute bottom-4 right-4 w-px h-8 bg-cyan-400/40" />
      </div>
    </div>
  );
}
