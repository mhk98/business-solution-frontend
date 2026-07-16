import Header from "../components/common/Header";
import ShifaReportManager from "../components/shifa/ShifaReportManager";

const ShifaPatientUpdatePage = () => {
  return (
    <>
      <Header title="Patient Update" />
      <div className="p-6">
        <ShifaReportManager reportType="patient_update" />
      </div>
    </>
  );
};

export default ShifaPatientUpdatePage;
