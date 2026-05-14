import Header from "../components/common/Header";
import ReturnProductTable from "../components/returnProduct/returnProductTable";

const ReturnProductPage = () => {
  return (
    <div className="flex-1 min-w-0 relative z-10">
      <Header title="Sales Return Product" />

      <main className="max-w-8xl w-full min-w-0 mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ReturnProductTable />
      </main>
    </div>
  );
};
export default ReturnProductPage;
