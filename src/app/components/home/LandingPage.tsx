import { NavBar }             from './NavBar';
import { Hero }               from './Hero';
import { PlatformMarquee }    from './PlatformMarquee';
import { Benefits }           from './Benefits';
import { DistributeGlobally } from './DistributeGlobally';
import { Curators }           from './Curators';
import { Publishing }         from './Publishing';
import { PublicPages }        from './PublicPages';
import { AgencyServices }     from './AgencyServices';
import { VideoShowcase }      from './VideoShowcase';
import { CreativeStudio }     from './CreativeStudio';
import { Pricing }            from './Pricing';
import { FAQ }                from './FAQ';
import { FinalCTA }           from './FinalCTA';
import { Footer }             from './Footer';
import { BlogPreviewSection } from './BlogPreviewSection';
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
      {/* AI Creative Studio — social publishing, scheduling, AI content */}
      <CreativeStudio />
      {/* Cinematic video showcase + animated stats section */}
      <VideoShowcase />
      <Pricing />
      <FAQ />
      {/* Blog preview — topical authority signals for SEO */}
      <BlogPreviewSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}