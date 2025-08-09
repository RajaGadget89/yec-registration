"use client";

interface DesktopVideoProps {
  videoUrl: string;
}

export default function DesktopVideo({ videoUrl }: DesktopVideoProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={videoUrl}
        title="YEC Day Hero Video - Desktop Version"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="eager"
      />
    </div>
  );
}
