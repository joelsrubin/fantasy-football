"use client";

import { useEffect, useState } from "react";

export const useMediaQuery = (query: string) => {
  const [hasMatches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== hasMatches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [hasMatches, query]);

  return hasMatches;
};
