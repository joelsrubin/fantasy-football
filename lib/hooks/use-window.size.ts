"use client";

import { createContext, useContext } from "react";

export const WindowSizeContext = createContext({
  isSmallMobile: false,
  isMobile: false,
  isTabletOrLarger: false,
  isDesktopOrLarger: false,
  isLargeDesktop: false,
});

export const useWindowSize = () => {
  const context = useContext(WindowSizeContext);

  if (!context) {
    throw new Error("useWindowSize must be used within a WindowSizeContainer");
  }

  return context;
};
