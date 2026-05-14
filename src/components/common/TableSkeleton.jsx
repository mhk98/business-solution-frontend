const TableSkeleton = ({ rows = 6, columns = 5 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-white"
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div
            key={colIdx}
            className={`h-4 rounded-lg bg-slate-100 ${
              colIdx === 0 ? "w-8 shrink-0" : "flex-1"
            } ${colIdx === columns - 1 ? "w-20 shrink-0 flex-none" : ""}`}
          />
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
