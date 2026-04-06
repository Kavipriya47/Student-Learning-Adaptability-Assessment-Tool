import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    // Helper to generate page numbers
    const getPageNumbers = () => {
        const delta = 2; // How many pages to show before and after current page
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - delta && i < currentPage + delta + 1)) {
                range.push(i);
            }
        }

        range.forEach(i => {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        });

        return rangeWithDots;
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-bg-surface-light/30 border-t border-border-subtle rounded-b-xl">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-muted hover:bg-bg-surface-light disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-medium text-text-muted hover:bg-bg-surface-light disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-text-dim">
                        Showing page <span className="font-medium text-text-main">{currentPage}</span> of{' '}
                        <span className="font-medium text-text-main">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm gap-1" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md px-2 py-2 text-text-muted hover:bg-bg-surface hover:text-white focus:z-20 disabled:opacity-50 border border-transparent hover:border-border-subtle transition-all"
                        >
                            <span className="sr-only">First</span>
                            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md px-2 py-2 text-text-muted hover:bg-bg-surface hover:text-white focus:z-20 disabled:opacity-50 border border-transparent hover:border-border-subtle transition-all"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {getPageNumbers().map((pageNumber, index) => (
                            <button
                                key={index}
                                onClick={() => typeof pageNumber === 'number' ? onPageChange(pageNumber) : null}
                                disabled={typeof pageNumber !== 'number'}
                                className={`relative inline-flex items-center px-3.5 py-2 text-sm font-semibold rounded-md transition-all ${pageNumber === currentPage
                                    ? 'z-10 bg-primary/20 text-primary border border-primary/30'
                                    : typeof pageNumber === 'number'
                                        ? 'text-text-muted hover:bg-bg-surface hover:text-white border border-transparent hover:border-border-subtle'
                                        : 'text-text-dim cursor-default'
                                    }`}
                            >
                                {pageNumber}
                            </button>
                        ))}

                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-md px-2 py-2 text-text-muted hover:bg-bg-surface hover:text-white focus:z-20 disabled:opacity-50 border border-transparent hover:border-border-subtle transition-all"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-md px-2 py-2 text-text-muted hover:bg-bg-surface hover:text-white focus:z-20 disabled:opacity-50 border border-transparent hover:border-border-subtle transition-all"
                        >
                            <span className="sr-only">Last</span>
                            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
