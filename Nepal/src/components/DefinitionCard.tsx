export function DefinitionCard() {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Definition: What is Runoff?</h3>
          <p className="text-slate-600 leading-relaxed">
            When rain falls, some of it soaks into the ground through a process called <strong className="text-slate-800">infiltration</strong>. When the ground cannot absorb any more water, the extra water flows over the surface. This flowing water is called <strong className="text-slate-800">runoff</strong> — it is the portion of precipitation that moves across the land surface toward streams, rivers, or other bodies of water.
          </p>
        </div>
      </div>
    </div>
  );
}
