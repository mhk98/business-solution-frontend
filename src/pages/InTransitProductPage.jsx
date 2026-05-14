// import { motion } from "framer-motion";

import Header from "../components/common/Header";
import IntransiteProductTable from "../components/inTransiteProduct/inTransiteProductTable";

const InTransitProductPage = () => {
  return (
    <div className="flex-1 min-w-0 relative z-10">
      <Header title="Intransit Product" />

      <main className="max-w-8xl w-full min-w-0 mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <IntransiteProductTable />
      </main>
    </div>
  );
};
export default InTransitProductPage;
