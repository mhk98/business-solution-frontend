import Header from "../components/common/Header";
import AdsCampaignKPITable from "../components/adsCampaignKPI/AdsCampaignKPITable";

const AdsCampaignKPIPage = () => {
  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Ads Campaign KPI" />
      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <AdsCampaignKPITable />
      </main>
    </div>
  );
};

export default AdsCampaignKPIPage;
