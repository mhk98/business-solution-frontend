import Header from "../components/common/Header";
import CourierBalanceTable from "../components/courierBalance/CourierBalanceTable";

const CourierBalancePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Courier Balance" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <CourierBalanceTable />
      </main>
    </div>
  );
};

export default CourierBalancePage;
