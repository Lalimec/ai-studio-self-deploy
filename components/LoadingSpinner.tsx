import React, { useState, useEffect } from 'react';

const messages = [
  "Warming up the AI stylists...",
  "Analyzing your features...",
  "Mixing the perfect hair colors...",
  "Crafting your new looks...",
  "Almost ready for your big reveal!",
  "Just a few more seconds...",
];

const LoadingSpinner: React.FC = () => {
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessage(prev => {
        const currentIndex = messages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
      <h2 className="text-2xl font-bold mt-6 text-[var(--color-text-main)]">Generating Your Styles</h2>
      <p className="text-[var(--color-text-dim)] mt-2">{message}</p>
    </div>
  );
};

export default LoadingSpinner;