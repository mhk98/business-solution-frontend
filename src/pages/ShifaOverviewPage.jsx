import Header from "../components/common/Header";
import ShifaOverview from "../components/shifa/ShifaOverview";

const ShifaOverviewPage = () => {
  return (
    <>
      <Header title="Shifa Overview" />
      <div className="p-6">
        <ShifaOverview />
      </div>
    </>
  );
};

export default ShifaOverviewPage;
