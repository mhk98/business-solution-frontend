import Header from "../components/common/Header";
import PettyCashTable from "../components/pettyCash/pettyCashTable";

const PettyCashRequisitionPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Petty Cash Requisition" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PettyCashTable mode="requisition" />
      </main>
    </div>
  );
};

export default PettyCashRequisitionPage;
