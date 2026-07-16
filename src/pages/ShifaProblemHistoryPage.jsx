import Header from "../components/common/Header";
import ShifaReportManager from "../components/shifa/ShifaReportManager";

const ShifaProblemHistoryPage = () => {
  return (
    <>
      <Header title="Problem History" />
      <div className="p-6">
        <ShifaReportManager reportType="problem_history" />
      </div>
    </>
  );
};

export default ShifaProblemHistoryPage;
