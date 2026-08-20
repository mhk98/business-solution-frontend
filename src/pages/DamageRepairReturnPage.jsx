import Header from "../components/common/Header";
import DamageRepairReturnTable from "../components/DamageRepairReturn/DamageRepairReturnTable";

const DamageRepairReturnPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Damage Repairing Return" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <DamageRepairReturnTable />
      </main>
    </div>
  );
};

export default DamageRepairReturnPage;
