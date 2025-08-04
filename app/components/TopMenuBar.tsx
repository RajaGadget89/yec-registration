'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function TopMenuBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLandingPage, setIsLandingPage] = useState(false);

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
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isLandingPage 
          ? (isScrolled ? 'bg-yec-primary shadow-md' : 'bg-transparent')
          : 'bg-yec-primary shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            {/* Desktop Logo */}
            <div className="hidden md:block">
              <Image 
                src="/assets/logo-full.png" 
                alt="YEC Day Logo" 
                width={180} 
                height={60} 
                className="h-12 w-auto"
                priority
              />
            </div>
            {/* Mobile Logo */}
            <div className="md:hidden">
              <Image 
                src="/assets/logo-shield-only.png" 
                alt="YEC Day Logo" 
                width={56} 
                height={56} 
                className="h-12 w-auto"
                priority
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a 
              href="#home" 
              className="text-lg font-bold text-white hover:text-yec-accent transition-colors"
            >
              Home
            </a>
            <a 
              href="#about" 
              className="text-lg font-bold text-white hover:text-yec-accent transition-colors"
            >
              About
            </a>
            <a 
              href="#form" 
              className="text-lg font-bold text-white hover:text-yec-accent transition-colors"
            >
              Register
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-white hover:text-yec-accent transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 