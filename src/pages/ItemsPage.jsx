// import { motion } from "framer-motion";

import Header from "../components/common/Header";
import ItemsTable from "../components/item/ItemsTable";
// import StatCard from "../components/common/StatCard";

// import { AlertTriangle, DollarSign, Package, TrendingUp } from "lucide-react";

const ItemsPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Manufacture Items" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ItemsTable />
      </main>
    </div>
  );
};
export default ItemsPage;
