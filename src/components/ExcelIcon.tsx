import React from 'react';

/**
 * Small inline Excel file icon used by the Import Excel / Export Excel
 * actions. Implemented as plain SVG so no icon library dependency is added.
 */
export function ExcelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#1D6F42" />
      <path d="M7 7L11 12L7 17H9.4L12 13.5L14.6 17H17L13 12L17 7H14.6L12 10.5L9.4 7H7Z" fill="#ffffff" />
    </svg>
  );
}
