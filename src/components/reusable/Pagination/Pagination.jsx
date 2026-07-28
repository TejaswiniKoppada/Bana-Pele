import { ChevronLeftIcon, ChevronRightIcon } from '@/assets/icons';
import './Pagination.css';

/** Generic prev/next pager — purely prop-driven, no business logic. Renders nothing when there's only one page. */
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeftIcon />
      </button>
      <span className="pagination__label">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
