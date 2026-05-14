import Header from "../components/common/Header";
import GoogleTable from "../components/google/googleTable";

const GooglePage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Google Expense" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <GoogleTable />
      </main>
    </div>
  );
};
export default GooglePage;
