import React from 'react';

export default function Header() {
  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
      <div className="flex items-center">
        <img src="/img/logo.png" alt="QtPi Logo" className="h-8 w-auto mr-4" />
        <span className="text-xl font-bold">Low Code Platform</span>
      </div>
      <span className="text-sm text-gray-300">Managed by QtPi Desktop Suite</span>
    </header>
  );
}
