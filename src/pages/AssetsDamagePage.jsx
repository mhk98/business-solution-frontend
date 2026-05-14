// import { motion } from "framer-motion";
import AssetsDamageTable from "../components/assetsDamage/AssetsDamageTable";
import Header from "../components/common/Header";

const AssetsDamagePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Assets Damage" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <AssetsDamageTable />
      </main>
    </div>
  );
};
export default AssetsDamagePage;
