import Header from "../components/common/Header";
import LogisticWorkReportManager from "../components/hrm/LogisticWorkReportManager";

const LogisticWorkReportPage = () => {
  return (
    <>
      <Header title="Logistic Work Reports" />
      <div className="p-6">
        <LogisticWorkReportManager />
      </div>
    </>
  );
};

export default LogisticWorkReportPage;
