import { Lock } from "lucide-react";
import SettingSection from "./SettingSection";
import ToggleSwitch from "./ToggleSwitch";
import { useState } from "react";

const Security = () => {
	const [twoFactor, setTwoFactor] = useState(false);

	return (
		<SettingSection icon={Lock} title={"Security Firewall"}>
			<ToggleSwitch
				label={"Advanced Two-Factor Authentication"}
				isOn={twoFactor}
				onToggle={() => setTwoFactor(!twoFactor)}
			/>
			<p className="text-[10px] text-slate-400 font-medium px-1 mb-6 italic">Secure your account with an additional layer of biometric or token-based verification.</p>

			<div className='mt-6 pt-4 border-t border-slate-50'>
				<button
					className='w-full sm:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-200 active:scale-95 shadow-lg shadow-slate-100'
				>
					Reset Access Password
				</button>
			</div>
		</SettingSection>
	);
};
export default Security;
