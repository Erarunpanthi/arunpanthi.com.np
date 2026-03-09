import { Navbar } from './components/Navbar';
import { HeroHeader } from './components/HeroHeader';
import { DefinitionCard } from './components/DefinitionCard';
import { RainfallSection } from './components/RainfallSection';
import { SoilSection } from './components/SoilSection';
import { TopographySection } from './components/TopographySection';
import { LandUseSection } from './components/LandUseSection';
import { SummarySection } from './components/SummarySection';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <HeroHeader />

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <div className="space-y-14 md:space-y-20">
          <DefinitionCard />
          <RainfallSection />
          <SoilSection />
          <TopographySection />
          <LandUseSection />
          <SummarySection />
        </div>
      </main>

      <Footer />
    </div>
  );
}
