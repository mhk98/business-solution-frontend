// import { motion } from "framer-motion";

import AssetsPurchaseTable from "../components/assetsPurchase/AssetsPurchaseTable";
import Header from "../components/common/Header";

const AssetsPurchasePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Purchase Assets" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AssetsPurchaseTable />
      </main>
    </div>
  );
};
export default AssetsPurchasePage;
