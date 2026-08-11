import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
