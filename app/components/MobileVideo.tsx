"use client";

interface MobileVideoProps {
  videoUrl: string;
}

export default function MobileVideo({ videoUrl }: MobileVideoProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <iframe
        className="absolute inset-0 w-full h-full"
        src={videoUrl}
        title="YEC Day Hero Video - Mobile Version"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="eager"
      />
    </div>
  );
}
