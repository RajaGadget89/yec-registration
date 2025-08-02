"use client";

interface YouTubeBackgroundProps {
  videoUrl: string;
}

export default function YouTubeBackground({ videoUrl }: YouTubeBackgroundProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={videoUrl}
        title="Background Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
} 