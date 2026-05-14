import Header from "../components/common/Header";
import RolePermissionsManager from "../components/settings/RolePermissionsManager";

const RolePermissionsPage = () => {
  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title="Role Permissions" />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <RolePermissionsManager />
      </main>
    </div>
  );
};

export default RolePermissionsPage;
