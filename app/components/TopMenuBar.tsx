'use client';

import { useState, useEffect } from 'react';

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
          ? 'bg-white shadow-md' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Placeholder */}
          <div className="flex items-center">
            <div className="text-2xl font-bold text-blue-900">
              YEC Day
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8">
            <a 
              href="#home" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-blue-900 hover:text-blue-700' 
                  : 'text-white hover:text-blue-200'
              }`}
            >
              Home
            </a>
            <a 
              href="#about" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-blue-900 hover:text-blue-700' 
                  : 'text-white hover:text-blue-200'
              }`}
            >
              About
            </a>
            <a 
              href="#form" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-blue-900 hover:text-blue-700' 
                  : 'text-white hover:text-blue-200'
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
                  ? 'text-blue-900 hover:text-blue-700' 
                  : 'text-white hover:text-blue-200'
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