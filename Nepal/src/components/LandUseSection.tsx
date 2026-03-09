export function LandUseSection() {
  const items = [
    {
      title: 'Dense Forest / Vegetation',
      description: 'Trees and plants intercept rainfall, slow down surface flow, and their roots help water seep into the soil. Leaf litter on the forest floor also acts as a natural barrier.',
      runoff: 'Low',
      color: 'emerald',
      bgClass: 'bg-emerald-50 border-emerald-100',
      badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      icon: (
        <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 L4 14h5l-2 7 10-11h-5z" />
        </svg>
      ),
      treeIcon: (
        <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22v-7" />
          <path d="M7 15l5-5 5 5" />
          <path d="M5 19l7-7 7 7" />
          <path d="M9 11l3-3 3 3" />
        </svg>
      ),
    },
    {
      title: 'Agricultural Land',
      description: 'Plowed fields may initially absorb water, but compacted or fallow soil can generate moderate to high runoff. Crop rows can channel water flow.',
      runoff: 'Moderate',
      color: 'amber',
      bgClass: 'bg-amber-50 border-amber-100',
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-600',
      icon: (
        <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-4h6v4" />
        </svg>
      ),
    },
    {
      title: 'Urban / Paved Surfaces',
      description: 'Concrete, asphalt, and rooftops are impervious — they prevent any infiltration. Virtually all rainfall on these surfaces becomes runoff.',
      runoff: 'Very High',
      color: 'red',
      bgClass: 'bg-red-50 border-red-100',
      badgeClass: 'bg-red-50 border-red-200 text-red-600',
      icon: (
        <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    },
  ];

  return (
    <section id="landuse" className="scroll-mt-20">
      <div className="mb-6">
        <span className="text-sm font-semibold uppercase tracking-wider text-sky-600">Section 04</span>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Land Use &amp; Vegetation Cover</h2>
        <p className="mt-3 text-slate-500 leading-relaxed max-w-2xl">
          The type of surface covering on a catchment area significantly influences how much precipitation becomes surface runoff.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md border-slate-100`}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${item.bgClass} border`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold ${item.badgeClass}`}>
                    {item.runoff} Runoff
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
