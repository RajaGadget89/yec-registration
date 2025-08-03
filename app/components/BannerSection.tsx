"use client";

import Image from "next/image";

export default function BannerSection() {
  const handleScrollToRegistration = () => {
    const target = document.getElementById("form");
    if (target) {
      const header = document.querySelector("header");
      const headerHeight = header ? header.offsetHeight : 80;
      const targetPosition = target.offsetTop - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  return (
    <section id="event-schedule" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4">
            Event Schedule & Activities
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover the exciting lineup of activities and networking opportunities planned for YEC Day
          </p>
        </div>

        {/* YEC Day Banner - Full image visible */}
        <div className="relative w-full h-96 sm:h-[500px] lg:h-[600px] bg-gradient-to-r from-yec-highlight/20 to-yec-accent/20 rounded-xl overflow-hidden mb-8 shadow-lg">
          <Image 
            src="/assets/YEC DAY2 _cre.png" 
            alt="YEC Day Banner" 
            fill
            className="object-contain"
            priority
          />
          {/* Optional overlay for better text readability if needed */}
          <div className="absolute inset-0 bg-black/5"></div>
        </div>

        {/* Event Highlights - Redesigned Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4">
          {/* Networking Card */}
          <div className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <Image 
                src="/assets/YEC-Networking.png" 
                alt="Networking" 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                <span className="inline-block animate-pulse">🤝</span> Networking
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                Connect with industry leaders and fellow entrepreneurs in an engaging environment designed for meaningful relationships.
              </p>
              
              {/* Animated underline */}
              <div className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </div>
          </div>

          {/* Learning Card */}
          <div className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <Image 
                src="/assets/YEC-Learning.png" 
                alt="Learning" 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                <span className="inline-block animate-bounce">📚</span> Learning
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                Gain valuable insights from expert speakers and interactive workshops that will accelerate your entrepreneurial journey.
              </p>
              
              {/* Animated underline */}
              <div className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </div>
          </div>

          {/* Growth Card */}
          <div className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <Image 
                src="/assets/YEC-Growth.png" 
                alt="Growth" 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                <span className="inline-block animate-ping">🚀</span> Growth
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                Discover new opportunities and strategies that will help your business scale and reach new heights of success.
              </p>
              
              {/* Animated underline */}
              <div className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </div>
          </div>
        </div>

        {/* Enhanced CTA Button - More engaging and motivating */}
        <div className="text-center mt-2">
          <button
            onClick={handleScrollToRegistration}
            className="group relative inline-flex items-center justify-center bg-gradient-to-r from-yec-accent to-yec-primary hover:from-yec-primary hover:to-yec-accent text-white font-bold px-10 py-5 rounded-full shadow-2xl transition-all duration-500 text-xl transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yec-highlight focus:ring-opacity-50 animate-pulse hover:animate-none overflow-hidden"
            aria-label="Register for YEC Day event"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            {/* Button content */}
            <span className="relative z-10 flex items-center space-x-2">
              <span>จองเลย!!</span>
              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          
          {/* Motivational text below button */}
          <p className="text-yec-primary font-medium mt-3 text-sm animate-bounce">
            🚀 Don&apos;t miss this opportunity! Limited spots available
          </p>
        </div>
      </div>
    </section>
  );
} 