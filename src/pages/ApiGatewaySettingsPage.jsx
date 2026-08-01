import { useParams } from "react-router-dom";
import Header from "../components/common/Header";
import ApiGatewaySettingsManager from "../components/settings/ApiGatewaySettingsManager";

const ApiGatewaySettingsPage = () => {
  const { gatewayType } = useParams();
  const normalizedGatewayType = gatewayType === "email" ? "email" : "sms";
  const title =
    normalizedGatewayType === "email" ? "Email Notification" : "SMS Gateway";

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title={title} />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <ApiGatewaySettingsManager gatewayType={normalizedGatewayType} />
      </main>
    </div>
  );
};

export default ApiGatewaySettingsPage;
