import React from 'react';

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>Prev</button>
      <span>Page {page + 1} of {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
