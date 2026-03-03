import { NavBar } from './NavBar';
import { Hero } from './Hero';
import { PlatformMarquee } from './PlatformMarquee';
import { Benefits } from './Benefits';
import { DistributeGlobally } from './DistributeGlobally';
import { Curators } from './Curators';
import { Publishing } from './Publishing';
import { PublicPages } from './PublicPages';
import { AgencyServices } from './AgencyServices';
import { Stats } from './Stats';
import { Pricing } from './Pricing';
import { FAQ } from './FAQ';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';
import { HomeStructuredData } from '../seo/StructuredData';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <HomeStructuredData />
      <NavBar />
      <Hero />
      <PlatformMarquee />
      <Benefits />
      <DistributeGlobally />
      <Curators />
      <Publishing />
      <PublicPages />
      <AgencyServices />
      <Stats />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}