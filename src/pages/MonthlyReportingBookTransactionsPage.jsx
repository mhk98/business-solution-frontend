import Header from "../components/common/Header";
import MonthlyReportingBookTransactionsTable from "../components/monthlyReportingBook/MonthlyReportingBookTransactionsTable";
import { isDefaultMasterPermissionEmail } from "../utils/masterPermissions";

const MonthlyReportingBookTransactionsPage = () => {
  const canOpenMonthlyReportingBook = isDefaultMasterPermissionEmail();

  return (
    <div className="flex-1 relative z-10">
      <Header title="Monthly Reporting Book" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        {canOpenMonthlyReportingBook ? (
          <MonthlyReportingBookTransactionsTable />
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-white p-6 text-sm font-semibold text-rose-600 shadow-sm">
            You do not have access to Monthly Reporting Book.
          </div>
        )}
      </main>
    </div>
  );
};
export default MonthlyReportingBookTransactionsPage;
