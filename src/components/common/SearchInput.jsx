import { Search } from "lucide-react";

const SearchInput = ({ value, onChange, placeholder = "Search...", className = "" }) => (
  <div className={`relative ${className}`}>
    <Search
      size={16}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 pl-9 pr-4 w-full border border-slate-200 rounded-xl bg-white text-slate-800 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
    />
  </div>
);

export default SearchInput;
