import React from 'react';

const Loader: React.FC<{ title: string; messages: string[] }> = ({ title, messages }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-[var(--color-bg-surface)] rounded-xl">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-accent)]"></div>
      <h2 className="text-2xl font-bold mt-6 text-[var(--color-text-main)]">{title}</h2>
      <div className="text-[var(--color-text-dim)] mt-2 w-full max-w-md">
        {messages.map((msg, index) => (
          <p key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Loader;
