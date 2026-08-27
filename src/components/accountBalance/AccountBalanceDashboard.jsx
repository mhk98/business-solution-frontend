import { Banknote, BookMarked, Smartphone, Wallet } from "lucide-react";
import Header from "../common/Header";
import { useGetAccountBalanceSummaryQuery } from "../../features/accountBalance/accountBalance";

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SummaryCard = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone}`}
      >
        <Icon size={18} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-lg font-bold text-slate-900">{formatAmount(value)}</p>
      </div>
    </div>
  </div>
);

const SectionTable = ({ title, icon: Icon, columns, rows, emptyText }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
    <div className="mb-4 flex items-center gap-2">
      <Icon size={18} className="text-indigo-600" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
        {title}
      </h3>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm ${
                    col.align === "right"
                      ? "text-right font-semibold text-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500">{emptyText}</div>
      )}
    </div>
  </div>
);

const AccountBalanceDashboard = () => {
  const { data, isLoading } = useGetAccountBalanceSummaryQuery();
  const summary = data?.data || {};

  const bankAccounts = summary.bankAccounts || [];
  const cashByBook = summary.cashByBook || [];
  const wallets = summary.wallets || [];

  const totalBank = Number(summary.totalBank || 0);
  const totalCash = Number(summary.totalCash || 0);
  const totalWallet = wallets.reduce((sum, row) => sum + Number(row.balance || 0), 0);

  return (
    <div className="flex-1 min-w-0 relative z-10">
      <Header title="Account Balance" />

      <main className="max-w-8xl w-full min-w-0 mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] space-y-6">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={Banknote}
                label="Total Bank Balance"
                value={totalBank}
                tone="border-indigo-100 bg-indigo-50 text-indigo-600"
              />
              <SummaryCard
                icon={Wallet}
                label="Total Cash Balance"
                value={totalCash}
                tone="border-emerald-100 bg-emerald-50 text-emerald-600"
              />
              <SummaryCard
                icon={Smartphone}
                label="Total Wallet Balance"
                value={totalWallet}
                tone="border-amber-100 bg-amber-50 text-amber-600"
              />
              <SummaryCard
                icon={BookMarked}
                label="Grand Total"
                value={totalBank + totalCash + totalWallet}
                tone="border-slate-200 bg-slate-50 text-slate-700"
              />
            </div>

            <SectionTable
              title="Bank Accounts"
              icon={Banknote}
              emptyText="No bank accounts found"
              columns={[
                { key: "bankName", label: "Bank Name" },
                { key: "accountNumber", label: "Account Number" },
                {
                  key: "balance",
                  label: "Balance",
                  align: "right",
                  render: (row) => formatAmount(row.balance),
                },
              ]}
              rows={bankAccounts.map((row) => ({ ...row, key: row.Id }))}
            />

            <SectionTable
              title="Cash (per Book)"
              icon={Wallet}
              emptyText="No books found"
              columns={[
                { key: "bookName", label: "Book" },
                {
                  key: "balance",
                  label: "Cash Balance",
                  align: "right",
                  render: (row) => formatAmount(row.balance),
                },
              ]}
              rows={cashByBook.map((row) => ({ ...row, key: row.bookId }))}
            />

            <SectionTable
              title="Mobile Wallets (Bkash / Nagad / Rocket / Others)"
              icon={Smartphone}
              emptyText="No wallet transactions found"
              columns={[
                { key: "paymentMode", label: "Payment Mode" },
                {
                  key: "balance",
                  label: "Balance",
                  align: "right",
                  render: (row) => formatAmount(row.balance),
                },
              ]}
              rows={wallets.map((row) => ({ ...row, key: row.paymentMode }))}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default AccountBalanceDashboard;
