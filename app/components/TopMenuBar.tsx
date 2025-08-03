'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function TopMenuBar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-yec-primary shadow-md' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            {/* Desktop Logo */}
            <div className="hidden md:block">
              <Image 
                src="/assets/logo-full.png" 
                alt="YEC Day Logo" 
                width={138} 
                height={46} 
                className="h-9 w-auto"
                priority
              />
            </div>
            {/* Mobile Logo */}
            <div className="md:hidden">
              <Image 
                src="/assets/logo-shield-only.png" 
                alt="YEC Day Logo" 
                width={46} 
                height={46} 
                className="h-9 w-9"
                priority
              />
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8">
            <a 
              href="#home" 
              className={`font-bold text-lg transition-colors ${
                isScrolled 
                  ? 'text-white hover:text-yec-accent' 
                  : 'text-white hover:text-yec-accent'
              }`}
            >
              Home
            </a>
            <a 
              href="#about" 
              className={`font-bold text-lg transition-colors ${
                isScrolled 
                  ? 'text-white hover:text-yec-accent' 
                  : 'text-white hover:text-yec-accent'
              }`}
            >
              About
            </a>
            <a 
              href="#form" 
              className={`font-bold text-lg transition-colors ${
                isScrolled 
                  ? 'text-white hover:text-yec-accent' 
                  : 'text-white hover:text-yec-accent'
              }`}
            >
              Register
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              className={`p-2 rounded-md ${
                isScrolled 
                  ? 'text-white hover:text-yec-accent' 
                  : 'text-white hover:text-yec-accent'
              }`}
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 