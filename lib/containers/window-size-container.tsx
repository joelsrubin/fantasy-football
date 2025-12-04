"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { WindowSizeContext } from "@/lib/hooks/use-window.size";

export function getTailwindScreens(): Record<"xs" | "sm" | "md" | "lg", string> {
  const requiredScreens: Array<"xs" | "sm" | "md" | "lg"> = ["xs", "sm", "md", "lg"];
  const validatedScreens: Record<"xs" | "sm" | "md" | "lg", string> = {} as Record<
    "xs" | "sm" | "md" | "lg",
    string
  >;
  const screens = {
    xs: "415px",
    sm: "769px",
    md: "1024px",
    lg: "1401px",
  };
  for (const screen of requiredScreens) {
    const value = (screens as Record<string, unknown>)[screen];
    if (typeof value !== "string") {
      throw new Error(`Missing or invalid screen size: ${screen}`);
    }
    validatedScreens[screen] = value;
  }

  return validatedScreens;
}

type TWindowSizeContainer = {
  children: ReactNode;
};

export default function WindowSizeContainer({ children }: TWindowSizeContainer) {
  const screensConfig = getTailwindScreens();

  const { xs, sm, md, lg } = screensConfig ?? {};
  const xsBreakpoint = Number.parseInt(xs, 10) - 1;
  const smBreakpoint = Number.parseInt(sm, 10) - 1;
  const mdBreakpoint = Number.parseInt(md, 10) - 1;
  const lgBreakpoint = Number.parseInt(lg, 10) - 1;

  const isSmallMobile = useMediaQuery(`only screen and (max-width : ${xsBreakpoint}px)`);
  const isMobile = useMediaQuery(`only screen and (max-width : ${smBreakpoint}px)`);
  const isTabletOrLarger = useMediaQuery(`only screen and (min-width : ${smBreakpoint + 1}px)`);
  const isDesktopOrLarger = useMediaQuery(`only screen and (min-width : ${mdBreakpoint}px)`);
  const isLargeDesktop = useMediaQuery(`only screen and (min-width : ${lgBreakpoint}px)`);

  const contextValue = useMemo(
    () => ({
      isSmallMobile,
      isMobile,
      isTabletOrLarger,
      isDesktopOrLarger,
      isLargeDesktop,
    }),
    [isSmallMobile, isMobile, isTabletOrLarger, isDesktopOrLarger, isLargeDesktop],
  );

  return <WindowSizeContext.Provider value={contextValue}>{children}</WindowSizeContext.Provider>;
}
