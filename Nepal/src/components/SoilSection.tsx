export function SoilSection() {
  const soilTypes = [
    {
      name: 'Sandy Soil',
      characteristics: 'Large gaps between particles; drains fast and allows water to percolate quickly.',
      potential: 'Low',
      potentialColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      icon: (
        <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="16" cy="16" r="1" /><circle cx="16" cy="8" r="1" /><circle cx="8" cy="16" r="1" />
        </svg>
      ),
    },
    {
      name: 'Clay Soil',
      characteristics: 'Tiny gaps between particles; sticky and extremely hard for water to penetrate.',
      potential: 'High',
      potentialColor: 'text-red-600 bg-red-50 border-red-200',
      icon: (
        <svg className="h-5 w-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 12h18" /><path d="M12 3v18" />
        </svg>
      ),
    },
    {
      name: 'Wet / Saturated Soil',
      characteristics: 'Already full of water from previous rainfall events; cannot absorb additional water.',
      potential: 'High (Immediate)',
      potentialColor: 'text-red-600 bg-red-50 border-red-200',
      icon: (
        <svg className="h-5 w-5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="soil" className="scroll-mt-20">
      <div className="mb-6">
        <span className="text-sm font-semibold uppercase tracking-wider text-sky-600">Section 02</span>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Soil Characteristics</h2>
        <p className="mt-3 text-slate-500 leading-relaxed max-w-2xl">
          The soil acts as a natural sponge. Its composition, texture, and current moisture level determine how much water stays in the ground and how much runs off.
        </p>
      </div>

      {/* Card-based table for soil types */}
      <div className="grid gap-4 md:grid-cols-3">
        {soilTypes.map((soil) => (
          <div
            key={soil.name}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
              {soil.icon}
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{soil.name}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{soil.characteristics}</p>
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Runoff Potential</span>
              <div className="mt-1.5">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${soil.potentialColor}`}>
                  {soil.potential}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
