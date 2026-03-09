import { useState } from 'react';

const navLinks = [
  { label: 'Home', href: '#top' },
  { label: 'Rainfall', href: '#rainfall' },
  { label: 'Soil', href: '#soil' },
  { label: 'Topography', href: '#topography' },
  { label: 'Land Use', href: '#landuse' },
  { label: 'Summary', href: '#summary' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo / Brand */}
        <a href="#top" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 transition-colors group-hover:bg-sky-700">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">HydroStudy</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
