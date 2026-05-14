import Header from "../components/common/Header";
import ChargeSettingsManager from "../components/settings/charge/ChargeSettingsManager";

const PAGE_COPY = {
  codChange: "COD Change",
  cod: "COD Charge",
  delivery: "Delivery Charge",
  deliveryAdvance: "Delivery Advance",
};

const ChargeSettingsPage = ({ chargeType = "cod" }) => {
  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title={PAGE_COPY[chargeType] || "Charge Settings"} />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <ChargeSettingsManager chargeType={chargeType} />
      </main>
    </div>
  );
};

export default ChargeSettingsPage;
