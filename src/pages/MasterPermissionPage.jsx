import Header from "../components/common/Header";
import MasterPermissionManager from "../components/settings/MasterPermissionManager";

const MasterPermissionPage = () => {
  return (
    <div className="min-h-screen flex-1 overflow-auto bg-slate-50/50">
      <Header title="Master Permission" />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <MasterPermissionManager />
      </main>
    </div>
  );
};

export default MasterPermissionPage;
