
import React from 'react';

const EnterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 10l-5 5 5 5"></path>
    <path d="M4 15h11a4 4 0 0 0 4-4V4"></path>
  </svg>
);

export default EnterIcon;
