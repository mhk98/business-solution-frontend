import Header from "../components/common/Header";
import LogoTable from "../components/logo/LogoTable";

const LogoPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Logo" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <LogoTable />
      </main>
    </div>
  );
};
export default LogoPage;
