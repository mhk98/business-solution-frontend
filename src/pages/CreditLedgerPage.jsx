import Header from "../components/common/Header";
import CreditLedgerTable from "../components/creditLedger/CreditLedgerTable";

const CreditLedgerPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Credit Ledger" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 h-[calc(100vh-64px)] flex flex-col">
        <CreditLedgerTable />
      </main>
    </div>
  );
};
export default CreditLedgerPage;
