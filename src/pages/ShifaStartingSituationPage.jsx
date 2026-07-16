import Header from "../components/common/Header";
import ShifaReportManager from "../components/shifa/ShifaReportManager";

const ShifaStartingSituationPage = () => {
  return (
    <>
      <Header title="Starting Situation" />
      <div className="p-6">
        <ShifaReportManager reportType="starting_situation" />
      </div>
    </>
  );
};

export default ShifaStartingSituationPage;
