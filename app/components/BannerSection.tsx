"use client";

import Image from "next/image";

export default function BannerSection() {
  const handleScrollToRegistration = () => {
    const target = document.getElementById("form");
    if (target) {
      const header = document.querySelector("header");
      const headerHeight = header ? header.offsetHeight : 96;
      const targetPosition = target.offsetTop - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  return (
    <section 
      id="event-schedule" 
      className="py-16 bg-white"
      aria-labelledby="event-schedule-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h2 
            id="event-schedule-heading"
            className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4"
          >
            Event Schedule & Activities
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover the exciting lineup of activities and networking opportunities planned for YEC Day
          </p>
        </header>

        {/* YEC Day Banner - Full image visible */}
        <div 
          className="relative w-full h-96 sm:h-[500px] lg:h-[600px] bg-gradient-to-r from-yec-highlight/20 to-yec-accent/20 rounded-xl overflow-hidden mb-8 shadow-lg"
          role="img"
          aria-label="YEC Day event banner featuring Songkhla location, November 23rd 2025 date, and Burisriphu Hotel Hatyai venue"
        >
          <Image 
            src="/assets/YEC-DAY2_cre.png" 
            alt="YEC Day Banner showing Songkhla event details for November 23rd 2025 at Burisriphu Hotel Hatyai" 
            fill
            className="object-contain"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
          />
          {/* Optional overlay for better text readability if needed */}
          <div className="absolute inset-0 bg-black/5" aria-hidden="true"></div>
        </div>

        {/* Event Highlights - Redesigned Cards */}
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4"
          role="list"
          aria-label="Event highlights and activities"
        >
          {/* Culture Card */}
          <article 
            className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 focus-within:ring-4 focus-within:ring-yec-accent focus-within:ring-opacity-50"
            role="listitem"
            tabIndex={0}
          >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <Image 
                src="/assets/YEC-Networking.png" 
                alt="Group of professionals networking and connecting in a business setting" 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              ></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                <span className="inline-block animate-pulse" aria-hidden="true">🎭</span>
                <span className="sr-only">Theater masks emoji representing</span> Culture
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                Immerse yourself in the rich cultural heritage and traditions while building meaningful relationships with diverse entrepreneurs and business leaders.
              </p>
              
              {/* Animated underline */}
              <div 
                className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                aria-hidden="true"
              ></div>
            </div>
          </article>

          {/* Connection Card */}
          <article 
            className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 focus-within:ring-4 focus-within:ring-yec-accent focus-within:ring-opacity-50"
            role="listitem"
            tabIndex={0}
          >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <Image 
                src="/assets/YEC-Learning.png" 
                alt="Group of people attending a workshop or learning session with colorful background" 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              ></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                <span className="inline-block animate-bounce" aria-hidden="true">🔗</span>
                <span className="sr-only">Link emoji representing</span> Connection
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                Build strong professional relationships and connect with like-minded entrepreneurs who share your vision and passion for business success.
              </p>
              
              {/* Animated underline */}
              <div 
                className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                aria-hidden="true"
              ></div>
            </div>
          </article>

          {/* Collaboration Card */}
          <article 
            className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 focus-within:ring-4 focus-within:ring-yec-accent focus-within:ring-opacity-50"
            role="listitem"
            tabIndex={0}
          >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <Image 
                src="/assets/YEC-Growth.png" 
                alt="Group of people on a wooden deck overlooking water, representing business collaboration and teamwork" 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              ></div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-yec-primary mb-3 group-hover:text-yec-accent transition-colors duration-300">
                <span className="inline-block animate-ping" aria-hidden="true">🤝</span>
                <span className="sr-only">Handshake emoji representing</span> Collaboration
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                Work together with fellow entrepreneurs to create innovative solutions and partnerships that drive mutual success and business growth.
              </p>
              
              {/* Animated underline */}
              <div 
                className="mt-4 h-1 bg-gradient-to-r from-yec-accent to-yec-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                aria-hidden="true"
              ></div>
            </div>
          </article>
        </div>

        {/* Enhanced CTA Button - More engaging and motivating */}
        <div className="text-center mt-2">
          <button
            onClick={handleScrollToRegistration}
            className="group relative inline-flex items-center justify-center bg-gradient-to-r from-yec-accent to-yec-primary hover:from-yec-primary hover:to-yec-accent text-white font-bold px-10 py-5 rounded-full shadow-2xl transition-all duration-500 text-xl transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yec-highlight focus:ring-opacity-50 animate-pulse hover:animate-none overflow-hidden"
            aria-label="Register for YEC Day event - Scrolls to registration form"
            aria-describedby="cta-description"
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
              aria-hidden="true"
            ></div>
            
            {/* Button content */}
            <span className="relative z-10 flex items-center space-x-2">
              <span>จองเลย!!</span>
              <svg 
                className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          
          {/* Motivational text below button */}
          <p 
            id="cta-description"
            className="text-yec-primary font-medium mt-3 text-sm animate-bounce"
            aria-live="polite"
          >
            <span className="inline-block animate-bounce" aria-hidden="true">🚀</span>
            <span className="sr-only">Rocket emoji indicating urgency</span>
            Don&apos;t miss this opportunity! Limited spots available
          </p>
        </div>
      </div>
    </section>
  );
} 