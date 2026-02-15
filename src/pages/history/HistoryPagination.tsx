import React from 'react';
import { Button } from '../../components/ui/button';

interface HistoryPaginationProps {
  totalPages: number;
  currentPage: number;
  offset: number;
  limit: number;
  total: number;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const HistoryPagination: React.FC<HistoryPaginationProps> = ({
  totalPages,
  currentPage,
  offset,
  limit,
  total,
  handlePreviousPage,
  handleNextPage,
  t,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card sm:px-6 mt-4 rounded-lg border-2 border-border">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          variant="outline"
          onClick={handlePreviousPage}
          disabled={offset === 0}
        >
          {t('history.previous')}
        </Button>
        <Button
          variant="outline"
          onClick={handleNextPage}
          disabled={offset + limit >= total}
          className="ml-3"
        >
          {t('history.next')}
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-foreground">
            {t('history.pagination', { from: offset + 1, to: Math.min(offset + limit, total), total })}
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={offset === 0}
              className="rounded-r-none"
            >
              <span className="sr-only">{t('history.previous')}</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Button>
            <span className="relative inline-flex items-center px-4 py-2 border border-input bg-background text-sm font-medium text-foreground">
              {t('history.pageOf', { current: currentPage, total: totalPages })}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={offset + limit >= total}
              className="rounded-l-none"
            >
              <span className="sr-only">{t('history.next')}</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default HistoryPagination;
