import React from 'react';
import Header from './Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-200">
      <Header />
      <main className="min-h-0 flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
