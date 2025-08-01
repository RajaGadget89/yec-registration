import TopMenuBar from './components/TopMenuBar';
import HeroSection from './components/HeroSection';
import BannerSection from './components/BannerSection';
import RegistrationForm from './components/RegistrationForm';
import Footer from './components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <TopMenuBar />
      <HeroSection />
      <BannerSection />
      <RegistrationForm />
      <Footer />
    </main>
  );
}
