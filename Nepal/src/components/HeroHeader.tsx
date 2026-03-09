export function HeroHeader() {
  return (
    <header id="top" className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50 border-b border-slate-100">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-700 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
            Hydrology &amp; Engineering
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Factors Affecting Runoff from Catchment Areas
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-500 max-w-2xl">
            A simplified technical bulletin explaining why rainwater flows over land surfaces, and the key variables that determine surface runoff in watershed management.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#rainfall" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-all hover:bg-sky-700 hover:shadow-md hover:shadow-sky-200">
              Start Reading
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
            <a href="#summary" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300">
              View Summary
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
