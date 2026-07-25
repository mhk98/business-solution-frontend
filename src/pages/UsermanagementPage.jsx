import Header from "../components/common/Header";
import UserManagementTable from "../components/userManagement/userManagementTable";

const UsermanagementPage = () => {
  return (
    <div className="flex-1 relative z-10 ">
      <Header title="User Management" />

      <main className="max-w-8xl mx-auto min-h-[calc(100vh-64px)] bg-slate-50 px-3 py-4 sm:px-4 sm:py-5 lg:px-8 lg:py-6">
        <UserManagementTable />
      </main>
    </div>
  );
};
export default UsermanagementPage;
