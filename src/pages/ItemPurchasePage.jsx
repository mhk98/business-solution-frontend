import Header from "../components/common/Header";
import ManufactureTable from "../components/manufacture/ManufactureTable";

const ItemPurchasePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Item Purchase" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ManufactureTable />
      </main>
    </div>
  );
};
export default ItemPurchasePage;
