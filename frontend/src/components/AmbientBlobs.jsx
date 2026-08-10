import React from 'react';

export function AmbientBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      <div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-40"
        style={{ background: 'var(--sage)', animation: 'blobFloat 6s ease-in-out infinite' }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-40"
        style={{ background: 'var(--lavender)', animation: 'blobFloat 7s ease-in-out infinite 1s' }}
      />
      <div
        className="absolute -bottom-40 left-1/4 w-[400px] h-[400px] rounded-full blur-3xl opacity-30"
        style={{ background: 'var(--peach)', animation: 'blobFloat 8s ease-in-out infinite 2s' }}
      />
      <style>{`
        @keyframes blobFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
