export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900">HydroStudy</span>
          </div>
          <p className="text-sm text-slate-400 text-center">
            Technical Bulletin on Catchment Hydrology. For educational and reference purposes.
          </p>
          <a
            href="#top"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:border-slate-300"
          >
            Back to Top
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
