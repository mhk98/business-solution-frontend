import Header from "../components/common/Header";
import SEOTable from "../components/seo/seoTable";

const SEOPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="SEO Expense" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <SEOTable />
      </main>
    </div>
  );
};
export default SEOPage;
