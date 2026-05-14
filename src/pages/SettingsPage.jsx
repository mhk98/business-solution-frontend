import Header from "../components/common/Header";
import ConnectedAccounts from "../components/settings/ConnectedAccounts";
import DangerZone from "../components/settings/DangerZone";
import Notifications from "../components/settings/Notifications";
import Profile from "../components/settings/Profile";
import Security from "../components/settings/Security";
import { motion } from "framer-motion";

const SettingsPage = () => {
	return (
		<div className='flex-1 overflow-auto bg-slate-50/50 min-h-screen'>
			<Header title='System Settings' />
			<main className='max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8'>
				<div className="mb-8">
					<h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuration Cabinet</h1>
					<p className="text-slate-500 text-sm mt-1 font-medium italic">Customize your interface, security protocols, and operational parameters.</p>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="space-y-8 pb-20"
				>
					<Profile />
					<Notifications />
					<Security />
					<ConnectedAccounts />
					<DangerZone />
				</motion.div>
			</main>
		</div>
	);
};
export default SettingsPage;
