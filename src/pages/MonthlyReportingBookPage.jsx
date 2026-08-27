import { useState } from "react";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import Header from "../components/common/Header";
import MonthlyReportingBookTable from "../components/monthlyReportingBook/MonthlyReportingBookTable";
import CompanyInfoTable from "../components/companyInfo/CompanyInfoTable";
import { isDefaultMasterPermissionEmail } from "../utils/masterPermissions";

const MonthlyReportingBookPage = () => {
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const canOpenMonthlyReportingBook = isDefaultMasterPermissionEmail();

  return (
    <div className="flex-1 relative z-10">
      <Header title="Monthly Reporting Book" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        {canOpenMonthlyReportingBook ? (
          <>
            <button
              type="button"
              onClick={() => setShowCompanyInfo((prev) => !prev)}
              className="inline-flex items-center gap-2 mb-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Building2 size={16} className="text-indigo-600" />
              Company Info (used on PDF statements)
              {showCompanyInfo ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {showCompanyInfo && <CompanyInfoTable />}

            <MonthlyReportingBookTable />
          </>
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-white p-6 text-sm font-semibold text-rose-600 shadow-sm">
            You do not have access to Monthly Reporting Book.
          </div>
        )}
      </main>
    </div>
  );
};
export default MonthlyReportingBookPage;
