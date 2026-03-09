export function RainfallSection() {
  return (
    <section id="rainfall" className="scroll-mt-20">
      <div className="mb-6">
        <span className="text-sm font-semibold uppercase tracking-wider text-sky-600">Section 01</span>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Rainfall Characteristics</h2>
        <p className="mt-3 text-slate-500 leading-relaxed max-w-2xl">
          The type of rain is the most immediate driver of runoff. Both intensity and duration play critical roles in determining how much water flows over the surface.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Intensity Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M16 14v6M8 14v6M12 16v6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-3">Rainfall Intensity</h3>
          <p className="text-sm text-slate-500 mb-4">How hard it rains over a given period</p>
          <div className="space-y-3">
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-3 w-3 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </span>
                <span className="text-sm font-semibold text-red-800">Heavy Rain</span>
              </div>
              <p className="text-sm text-red-700 leading-relaxed">
                If rain falls faster than the soil can absorb it, water flows over the surface, causing <strong>high runoff</strong>.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                </span>
                <span className="text-sm font-semibold text-emerald-800">Gentle Rain</span>
              </div>
              <p className="text-sm text-emerald-700 leading-relaxed">
                If rain falls slowly, the soil has adequate time to absorb it, producing <strong>low runoff</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Duration Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-3">Rainfall Duration</h3>
          <p className="text-sm text-slate-500 mb-4">How long it rains continuously</p>
          <div className="space-y-3">
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100">
                  <svg className="h-3 w-3 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M5 12h14" /></svg>
                </span>
                <span className="text-sm font-semibold text-sky-800">Short Duration</span>
              </div>
              <p className="text-sm text-sky-700 leading-relaxed">
                A quick burst of rain may be absorbed entirely by dry soil, resulting in minimal runoff.
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                  <svg className="h-3 w-3 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </span>
                <span className="text-sm font-semibold text-orange-800">Long Duration</span>
              </div>
              <p className="text-sm text-orange-700 leading-relaxed">
                Prolonged rain saturates the soil completely. Once full, all additional rain becomes <strong>surface runoff</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
