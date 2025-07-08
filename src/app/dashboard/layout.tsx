import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

type Props = {
  children: ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

export default Layout;