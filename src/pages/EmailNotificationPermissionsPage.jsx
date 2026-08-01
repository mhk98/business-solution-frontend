import Header from "../components/common/Header";
import EmailNotificationPermissionsManager from "../components/settings/EmailNotificationPermissionsManager";

const EmailNotificationPermissionsPage = () => {
  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 min-h-screen">
      <Header title="Email Notification Permissions" />
      <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <EmailNotificationPermissionsManager />
      </main>
    </div>
  );
};

export default EmailNotificationPermissionsPage;
