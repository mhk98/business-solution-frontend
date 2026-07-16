import Header from "../components/common/Header";
import ShifaReportManager from "../components/shifa/ShifaReportManager";

const ShifaCallHistoryPage = () => {
  return (
    <>
      <Header title="Call History" />
      <div className="p-6">
        <ShifaReportManager reportType="call_history" />
      </div>
    </>
  );
};

export default ShifaCallHistoryPage;
