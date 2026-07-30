import Header from "../components/common/Header";
import MasterPermissionManager from "../components/settings/MasterPermissionManager";
import { isDefaultMasterPermissionEmail } from "../utils/masterPermissions";

const MasterPermissionPage = () => {
  const canOpenMasterPermission = isDefaultMasterPermissionEmail();

  return (
    <div className="min-h-screen flex-1 overflow-auto bg-slate-50/50">
      <Header title="Master Permission" />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {canOpenMasterPermission ? (
          <MasterPermissionManager />
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-white p-6 text-sm font-semibold text-rose-600 shadow-sm">
            You do not have access to Master Permission.
          </div>
        )}
      </main>
    </div>
  );
};

export default MasterPermissionPage;
