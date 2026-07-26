import Header from "../components/common/Header";
import LogHistoryTable from "../components/logHistory/LogHistoryTable";
import { useSearchParams } from "react-router-dom";

const LogHistoryPage = () => {
  const [searchParams] = useSearchParams();
  const moduleFilter = searchParams.get("module") || "";
  const menuName = searchParams.get("menu") || "";
  const title = menuName ? `${menuName} Log History` : "Log History";

  return (
    <div className="flex-1 relative z-10">
      <Header title={title} />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <LogHistoryTable moduleFilter={moduleFilter} title={title} />
      </main>
    </div>
  );
};

export default LogHistoryPage;
