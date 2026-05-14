import { useState } from "react";
import SettingSection from "./SettingSection";
import { Plus, Share2 } from "lucide-react";

const ConnectedAccounts = () => {
	const [connectedAccounts, setConnectedAccounts] = useState([
		{
			id: 1,
			name: "Google Services",
			connected: true,
			icon: "https://www.google.com/favicon.ico",
		},
		{
			id: 2,
			name: "Meta Infrastructure",
			connected: false,
			icon: "https://www.facebook.com/favicon.ico",
		},
		{
			id: 3,
			name: "X Data Stream",
			connected: true,
			icon: "https://abs.twimg.com/favicons/twitter.2.ico",
		},
	]);
	return (
		<SettingSection icon={Share2} title={"Integration Hub"}>
			<div className="space-y-4">
				{connectedAccounts.map((account) => (
					<div key={account.id} className='flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all group'>
						<div className='flex items-center gap-3'>
							<div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-sm">
								<img src={account.icon} alt={account.name} className='w-full h-full object-contain' />
							</div>
							<span className='text-slate-700 font-bold text-sm tracking-tight'>{account.name}</span>
						</div>
						<button
							className={`px-5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${account.connected ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
								}`}
							onClick={() => {
								setConnectedAccounts(
									connectedAccounts.map((acc) => {
										if (acc.id === account.id) {
											return { ...acc, connected: !acc.connected };
										}
										return acc;
									})
								);
							}}
						>
							{account.connected ? "Active" : "Pair"}
						</button>
					</div>
				))}
			</div>

			<button className='mt-8 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-black text-xs uppercase tracking-[0.2em] transition-all hover:gap-3 px-1'>
				<Plus size={16} /> Link New Bridge
			</button>
		</SettingSection>
	);
};
export default ConnectedAccounts;
