import Header from "../components/common/Header";
import CourierProductStockTable from "../components/courierProductStock/CourierProductStockTable";

const CourierProductStockPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Courier Product Stock" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <CourierProductStockTable />
      </main>
    </div>
  );
};

export default CourierProductStockPage;
