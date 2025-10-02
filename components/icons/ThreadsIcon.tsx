import React from 'react';

const ThreadsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13.25 4.75C8.01 4.75 5.5 8.25 5.5 12s2.51 7.25 7.75 7.25c4.13 0 6.25-2.22 6.25-4.5a4.37 4.37 0 0 0-4.5-4.5h-2.5" />
  </svg>
);

export default ThreadsIcon;
