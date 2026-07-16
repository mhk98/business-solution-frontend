import Header from "../components/common/Header";
import PackagingItemPurchaseTable from "../components/packagingItemPurchase/PackagingItemPurchaseTable";

const PackagingItemPurchasePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Packaging Item Purchase" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <PackagingItemPurchaseTable />
      </main>
    </div>
  );
};

export default PackagingItemPurchasePage;
