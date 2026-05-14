import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

const PAGES_PER_SET = 5;

const Pagination = ({ currentPage, totalPages, onPageChange, totalCount, pageSize }) => {
  const [startPage, setStartPage] = useState(1);

  useEffect(() => {
    if (currentPage < startPage) {
      setStartPage(currentPage);
    } else if (currentPage > startPage + PAGES_PER_SET - 1) {
      setStartPage(currentPage - PAGES_PER_SET + 1);
    }
  }, [currentPage, startPage]);

  const endPage = Math.min(startPage + PAGES_PER_SET - 1, totalPages);

  const handlePrev = () => {
    if (startPage > 1) setStartPage((p) => Math.max(p - PAGES_PER_SET, 1));
  };

  const handleNext = () => {
    if (endPage < totalPages)
      setStartPage((p) => Math.min(p + PAGES_PER_SET, totalPages - PAGES_PER_SET + 1));
  };

  const showingFrom = totalCount ? (currentPage - 1) * (pageSize || 10) + 1 : null;
  const showingTo = totalCount ? Math.min(currentPage * (pageSize || 10), totalCount) : null;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        {totalCount && showingFrom ? (
          <>
            Showing{" "}
            <span className="text-indigo-600">{showingFrom}</span>
            {" "}to{" "}
            <span className="text-indigo-600">{showingTo}</span>
            {" "}of{" "}
            <span className="text-slate-900">{totalCount}</span>
          </>
        ) : (
          <>
            Showing Page{" "}
            <span className="text-indigo-600">{currentPage}</span>
            {" "}of{" "}
            <span className="text-slate-900">{totalPages}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={startPage === 1}
          className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <div className="flex items-center gap-1.5">
          {[...Array(endPage - startPage + 1)].map((_, i) => {
            const pageNum = startPage + i;
            const active = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${
                  active
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                    : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={endPage === totalPages}
          className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
