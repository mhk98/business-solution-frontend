import Header from "../components/common/Header";
import DamageRepairedTable from "../components/DamageRepaired/DamageRepairedTable";

const DamageRepairedPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Damage Repaired" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <DamageRepairedTable />
      </main>
    </div>
  );
};
export default DamageRepairedPage;
