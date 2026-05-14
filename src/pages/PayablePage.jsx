import Header from "../components/common/Header";
import PayableTable from "../components/payable/payableTable";

const PayablePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Payable" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PayableTable />
      </main>
    </div>
  );
};
export default PayablePage;
