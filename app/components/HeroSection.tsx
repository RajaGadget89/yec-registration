'use client';

export default function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* YouTube Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ&controls=1&showinfo=0&rel=0&modestbranding=1"
          title="YEC Day Hero Video"
          className="w-full h-full object-cover"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>

      {/* Content Container */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white px-4 sm:px-6 lg:px-8">
          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            YEC Day Registration
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl sm:text-2xl mb-8 max-w-2xl mx-auto">
            Join us for an exciting event filled with networking, learning, and growth opportunities
          </p>

          {/* CTA Button */}
          <a
            href="#form"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-4 px-8 rounded-lg text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            จองเลย!
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
} 