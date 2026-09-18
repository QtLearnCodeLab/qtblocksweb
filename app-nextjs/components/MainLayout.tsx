import React from 'react';
import Header from './Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-200">
      <Header />
      <main className="p-4">
        {children}
      </main>
    </div>
  );
}