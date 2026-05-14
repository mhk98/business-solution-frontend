import { FileText, ChevronDown } from "lucide-react";

const ReportMenu = ({ isOpen, setIsOpen, onPdf, onGoogleSheet, disabled }) => {
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:opacity-60 text-white transition duration-200 px-3 py-2 rounded"
      >
        <FileText size={18} />
        Report
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-700 rounded shadow-lg z-20 overflow-hidden">
          <button
            onClick={onPdf}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            PDF File
          </button>

          <button
            onClick={onGoogleSheet}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Google Sheet (XLSX)
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportMenu;
