import React from 'react';

// FIX: Add the optional `style` prop to allow inline styling, which is needed for PDF generation in JournalView.tsx.
const FlowmindIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M3 8c4 0 6 4 10 4s6-4 8-4"/>
    <path d="M3 12c4 0 6 4 10 4s6-4 8-4"/>
    <path d="M3 16c4 0 6 4 10 4s6-4 8-4"/>
  </svg>
);

export default FlowmindIcon;
