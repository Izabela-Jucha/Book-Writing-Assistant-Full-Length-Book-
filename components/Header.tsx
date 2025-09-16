import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                <span className="text-indigo-600 dark:text-indigo-400">Izabela Jucha</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Book Writing Assistant (Full Length Book)</p>
        </div>
      </div>
    </header>
  );
};

export default Header;