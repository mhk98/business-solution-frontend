import Header from "../components/common/Header";
import ItemRequisitionTable from "../components/itemRequisition/ItemRequisitionTable";

const ItemRequisitionPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Item Requisition" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ItemRequisitionTable />
      </main>
    </div>
  );
};

export default ItemRequisitionPage;
