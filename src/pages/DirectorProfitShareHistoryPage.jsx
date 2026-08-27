import { useParams } from "react-router-dom";
import Header from "../components/common/Header";
import DirectorProfitShareTable from "../components/ownerTransaction/DirectorProfitShareTable";
import { useGetSingleDirectorQuery } from "../features/ownerTransaction/directorProfitShare";

const DirectorProfitShareHistoryPage = () => {
  const { id } = useParams();
  const { data: directorRes } = useGetSingleDirectorQuery(id, { skip: !id });
  const director = directorRes?.data;

  return (
    <div className="flex-1 relative z-10">
      <Header title="Director Profit Share History" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <DirectorProfitShareTable
          directorId={id}
          directorName={director?.name || ""}
        />
      </main>
    </div>
  );
};

export default DirectorProfitShareHistoryPage;
