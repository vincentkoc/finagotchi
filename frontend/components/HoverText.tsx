"use client";

import { useEffect, useState } from "react";

export default function HoverText({ hoverText }: { hoverText: string | null }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }
    const updateMousePosition = (ev: MouseEvent): void => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, []);

  // don't render on mobile devices
  if (isMobile) {
    return null;
  }

  return (
    <div className="z-40 pointer-events-none">
      {hoverText && (
        <p
          className="absolute px-2 border-2 bg-zinc-100 flex justify-center items-center"
          style={{
            top: mousePosition.y,
            left: mousePosition.x,
            transform: "translate(10px, 10px)",
            pointerEvents: "none",
          }}
        >
          {hoverText}
        </p>
      )}
    </div>
  );
}
