import TopMenuBar from "./components/TopMenuBar";
import HeroSection from "./components/HeroSection";
import BannerSection from "./components/BannerSection";
import RegistrationForm from "./components/RegistrationForm";
import Footer from "./components/Footer";
import ClientPageHandler from "./components/ClientPageHandler";

export default function Home() {
  return (
    <main className="min-h-screen">
      <ClientPageHandler />
      <TopMenuBar />
      <HeroSection />
      <BannerSection />
      <RegistrationForm />
      <Footer />
    </main>
  );
}
