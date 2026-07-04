import Header from "../components/common/Header";
import ManufacturerTable from "../components/manufacturer/ManufacturerTable";

const ManufacturerPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Manufacturer" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <ManufacturerTable />
      </main>
    </div>
  );
};
export default ManufacturerPage;
