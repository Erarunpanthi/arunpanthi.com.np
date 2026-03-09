export function SummarySection() {
  const factors = [
    { factor: 'Heavy Rainfall', effect: 'Increases', description: 'Exceeds soil infiltration capacity' },
    { factor: 'Prolonged Duration', effect: 'Increases', description: 'Saturates soil over time' },
    { factor: 'Clay / Wet Soil', effect: 'Increases', description: 'Low permeability prevents absorption' },
    { factor: 'Sandy Soil', effect: 'Decreases', description: 'High permeability allows drainage' },
    { factor: 'Steep Slopes', effect: 'Increases', description: 'Gravity accelerates surface flow' },
    { factor: 'Dense Vegetation', effect: 'Decreases', description: 'Intercepts and slows water' },
    { factor: 'Urban Surfaces', effect: 'Increases', description: 'Impervious — no infiltration' },
    { factor: 'Flat Terrain', effect: 'Decreases', description: 'Allows ponding and infiltration' },
  ];

  return (
    <section id="summary" className="scroll-mt-20">
      <div className="mb-6">
        <span className="text-sm font-semibold uppercase tracking-wider text-sky-600">Summary</span>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Quick Reference Table</h2>
        <p className="mt-3 text-slate-500 leading-relaxed max-w-2xl">
          A consolidated overview of all factors and their impact on surface runoff from catchment areas.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Factor</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Effect on Runoff</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {factors.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{row.factor}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                        row.effect === 'Increases'
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}
                    >
                      {row.effect === 'Increases' ? (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                      ) : (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                      )}
                      {row.effect}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 hidden sm:table-cell">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Takeaway */}
      <div className="mt-6 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Key Takeaway</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Runoff is not determined by any single factor in isolation. It is the combined interaction of rainfall intensity, soil properties, topography, and land use that determines the total volume and rate of surface runoff from a catchment area. Understanding these relationships is essential for effective watershed management and flood risk assessment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
