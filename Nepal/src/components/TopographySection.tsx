export function TopographySection() {
  return (
    <section id="topography" className="scroll-mt-20">
      <div className="mb-6">
        <span className="text-sm font-semibold uppercase tracking-wider text-sky-600">Section 03</span>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Topography &amp; Slope</h2>
        <p className="mt-3 text-slate-500 leading-relaxed max-w-2xl">
          The shape and gradient of the land surface has a direct impact on how fast and how much water runs off during a rainfall event.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Steep Slopes */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20 L22 4" />
                <path d="M2 20 L22 20" />
                <path d="M22 4 L22 20" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Steep Slopes</h3>
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 mt-0.5">
                High Runoff
              </span>
            </div>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"></span>
              Water moves quickly downhill under gravity, leaving little time for infiltration into the soil.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"></span>
              Greater velocity increases the erosive power of the flowing water.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"></span>
              Mountain catchments typically exhibit rapid peak discharge during storms.
            </li>
          </ul>
        </div>

        {/* Flat Terrain */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 16 L22 16" />
                <path d="M2 20 L22 20" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Flat Terrain</h3>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 mt-0.5">
                Low Runoff
              </span>
            </div>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
              Water tends to pool on flat surfaces, allowing more time for infiltration.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
              Lower flow velocity reduces the erosive potential of surface water.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
              Plains and valleys generally experience slower, more distributed runoff responses.
            </li>
          </ul>
        </div>
      </div>

      {/* Catchment Shape */}
      <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Catchment Shape and Size</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">Fan-Shaped Catchments</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Water from tributaries arrives at the outlet simultaneously, producing a rapid and high peak discharge.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">Elongated Catchments</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Water arrives at the outlet at staggered times, resulting in a lower and more distributed peak discharge.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
