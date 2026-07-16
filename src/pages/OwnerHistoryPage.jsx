import { useParams } from "react-router-dom";
import Header from "../components/common/Header";
import OwnerTransactionTable from "../components/ownerTransaction/OwnerTransactionTable";
import { useGetSingleOwnerQuery } from "../features/ownerTransaction/ownerTransaction";

const OwnerHistoryPage = () => {
  const { id } = useParams();
  const { data: ownerRes } = useGetSingleOwnerQuery(id, { skip: !id });
  const owner = ownerRes?.data;

  return (
    <div className="flex-1 relative z-10">
      <Header title="Owner History" />
      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <OwnerTransactionTable ownerId={id} ownerName={owner?.name || ""} />
      </main>
    </div>
  );
};

export default OwnerHistoryPage;
