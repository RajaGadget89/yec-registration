'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function TopMenuBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLandingPage, setIsLandingPage] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the landing page (root path)
    const isLanding = window.location.pathname === '/' || window.location.pathname === '/index.html';
    setIsLandingPage(isLanding);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Only add scroll listener on landing page
    if (isLanding) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, []);

  // Handle Home navigation with fresh refresh
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      // If already on homepage, scroll to top and refresh
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      // If on different page, navigate to homepage
      router.push('/');
    }
  };

  // Handle Register navigation to form section
  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      // If on homepage, scroll to form section
      const formSection = document.getElementById('form');
      if (formSection) {
        const headerHeight = 96; // Approximate header height (h-24 = 6rem = 96px)
        const targetPosition = formSection.offsetTop - headerHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    } else {
      // If on different page, navigate to homepage and scroll to form
      router.push('/?scroll=form');
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isLandingPage 
          ? (isScrolled ? 'bg-white shadow-md' : 'bg-transparent')
          : 'bg-white shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo */}
          <div className="flex-shrink-0 mr-8">
            {/* Desktop Logo */}
            <div className="hidden md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/assets/logo-full.png" 
                alt="YEC Day Logo" 
                style={{ height: '92px', width: 'auto' }}
              />
            </div>
            {/* Mobile Logo */}
            <div className="md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/assets/logo-shield-only.png" 
                alt="YEC Day Logo" 
                style={{ height: '92px', width: 'auto' }}
              />
            </div>
          </div>

          {/* Navigation and Theme Toggle */}
          <div className="flex items-center space-x-6">
            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={handleHomeClick}
                className={`text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yec-accent focus:ring-offset-2 rounded px-2 py-1 ${
                  isLandingPage && !isScrolled 
                    ? 'text-white hover:text-yec-accent' 
                    : 'text-yec-primary hover:text-yec-accent'
                }`}
                aria-label="Go to homepage with fresh refresh"
              >
                Home
              </button>
              <button 
                onClick={handleRegisterClick}
                className={`text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yec-accent focus:ring-offset-2 rounded px-2 py-1 ${
                  isLandingPage && !isScrolled 
                    ? 'text-white hover:text-yec-accent' 
                    : 'text-yec-primary hover:text-yec-accent'
                }`}
                aria-label="Go to registration form section"
              >
                Register
              </button>
              <a 
                href="#about" 
                className={`text-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yec-accent focus:ring-offset-2 rounded px-2 py-1 ${
                  isLandingPage && !isScrolled 
                    ? 'text-white hover:text-yec-accent' 
                    : 'text-yec-primary hover:text-yec-accent'
                }`}
              >
                About
              </a>
            </nav>

            {/* Theme Toggle */}
            <ThemeToggle isLandingPage={isLandingPage} isScrolled={isScrolled} />

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-yec-accent focus:ring-offset-2 rounded p-1 ${
                  isLandingPage && !isScrolled 
                    ? 'text-white hover:text-yec-accent' 
                    : 'text-yec-primary hover:text-yec-accent'
                }`}
                aria-label="Toggle mobile menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 