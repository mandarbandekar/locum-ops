import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Layout } from '@/components/Layout';
import { MobileLayout } from './MobileLayout';

export function ResponsiveLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileLayout>{children}</MobileLayout>;
  return <Layout>{children}</Layout>;
}
