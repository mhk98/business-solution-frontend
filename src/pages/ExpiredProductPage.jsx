// import { motion } from "framer-motion";

import Header from "../components/common/Header";
import ExpireProductTable from "../components/ExpireProduct/ExpireProductTable";

const ExpiredProductPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Expired Product" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ExpireProductTable />
      </main>
    </div>
  );
};
export default ExpiredProductPage;
