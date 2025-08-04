'use client';

import { useEffect } from 'react';
import TopMenuBar from './components/TopMenuBar';
import HeroSection from './components/HeroSection';
import BannerSection from './components/BannerSection';
import RegistrationForm from './components/RegistrationForm';
import Footer from './components/Footer';

export default function Home() {
  useEffect(() => {
    // Handle scroll parameter from navigation
    const urlParams = new URLSearchParams(window.location.search);
    const scrollTarget = urlParams.get('scroll');
    const isEditMode = urlParams.get('edit') === 'true';
    
    if (scrollTarget === 'form' || isEditMode) {
      // Wait for page to load, then scroll to form section
      setTimeout(() => {
        const formSection = document.getElementById('form');
        if (formSection) {
          const headerHeight = 80; // Approximate header height
          const targetPosition = formSection.offsetTop - headerHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
          
          // Clean up URL parameters
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('scroll');
          newUrl.searchParams.delete('edit');
          window.history.replaceState({}, '', newUrl.toString());
        }
      }, 100);
    }
  }, []);

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
