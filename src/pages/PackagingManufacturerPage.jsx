import Header from "../components/common/Header";
import PackagingManufacturerTable from "../components/packagingManufacturer/PackagingManufacturerTable";

const PackagingManufacturerPage = () => (
  <div className="flex-1 relative z-10">
    <Header title="Packaging Manufacturer" />
    <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
      <PackagingManufacturerTable />
    </main>
  </div>
);

export default PackagingManufacturerPage;
