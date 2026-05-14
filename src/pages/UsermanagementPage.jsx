import Header from "../components/common/Header";
import UserManagementTable from "../components/userManagement/userManagementTable";

const UsermanagementPage = () => {
  return (
    <div className="flex-1 relative z-10 ">
      <Header title="User Management" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)] ">
        <UserManagementTable />
      </main>
    </div>
  );
};
export default UsermanagementPage;
