import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/home/TrustBar";
import { FeaturedHotels } from "@/components/FeaturedHotels";
import { FeaturedBlogs } from "@/components/FeaturedBlogs";
import { PackagesSection } from "@/components/packages/PackagesSection";
import { ListPropertyCta } from "@/components/home/ListPropertyCta";
import { isFeatureEnabled } from "@/lib/config/features";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <TrustBar />
        {isFeatureEnabled('hotels') && <FeaturedHotels />}
        <PackagesSection />
        {isFeatureEnabled('blogs') && <FeaturedBlogs />}
        <ListPropertyCta />
      </main>
      <Footer />
    </div>
  );
}
