import CategoryTable from "../components/accounting/CategoryTable";
import Header from "../components/common/Header";

const AccountingCategoryPage = () => {
  return (
    <div className="flex-1 overflow-auto bg-gray-100">
      <Header title="Category List" />
      <main className="mx-auto px-4 py-6 lg:px-8">
        <CategoryTable />
      </main>
    </div>
  );
};

export default AccountingCategoryPage;
