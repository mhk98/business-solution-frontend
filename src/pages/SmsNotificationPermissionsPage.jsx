import Header from "../components/common/Header";
import SmsNotificationPermissionsManager from "../components/settings/SmsNotificationPermissionsManager";

const SmsNotificationPermissionsPage = () => {
  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title="SMS Notification Permissions" />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <SmsNotificationPermissionsManager />
      </main>
    </div>
  );
};

export default SmsNotificationPermissionsPage;
