import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const isTablet = width >= TABLET_BREAKPOINT;

    const horizontalPadding = isTablet ? (isLandscape ? 28 : 22) : 14;
    const contentMaxWidth = isTablet ? (isLandscape ? 1180 : 900) : undefined;
    const formMaxWidth = isTablet ? (isLandscape ? 960 : 760) : undefined;
    const drawerWidth = isTablet ? clamp(width * 0.34, 280, 360) : 250;
    const modalMaxWidth = isTablet ? clamp(width * 0.72, 560, 780) : width - horizontalPadding * 2;
    const footerReserve = isTablet ? (isLandscape ? 132 : 124) : 120;
    const quickActionColumns = isTablet ? (isLandscape ? 4 : 3) : 3;

    return {
      width,
      height,
      isTablet,
      isLandscape,
      horizontalPadding,
      contentMaxWidth,
      formMaxWidth,
      drawerWidth,
      modalMaxWidth,
      footerReserve,
      quickActionColumns,
    };
  }, [width, height]);
}
