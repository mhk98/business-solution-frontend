// import { motion } from "framer-motion";

import AssetsSaleTable from "../components/assetsSale/AssetsSaleTable";
import Header from "../components/common/Header";

const AssetsSalePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Sale Assets" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AssetsSaleTable />
      </main>
    </div>
  );
};
export default AssetsSalePage;
