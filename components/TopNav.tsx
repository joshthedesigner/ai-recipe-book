'use client';

/**
 * Top Navigation Component
 * 
 * Responsive navigation that switches between mobile and desktop layouts
 * Mobile: <600px (sm breakpoint)
 * Desktop: >=600px
 */

import { useMediaQuery, useTheme } from '@mui/material';
import MobileNav from '@/components/MobileNav';
import DesktopNav from '@/components/DesktopNav';

export default function TopNav() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
