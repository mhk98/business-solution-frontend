import { User } from "lucide-react";
import SettingSection from "./SettingSection";

const Profile = () => {
	const role = localStorage.getItem("role") || "Guest";
	return (
		<SettingSection icon={User} title={"Identity Profile"}>
			<div className='flex flex-col sm:flex-row items-center gap-6 mb-8'>
				<img
					src='https://randomuser.me/api/portraits/men/3.jpg'
					alt='Profile'
					className='rounded-3xl w-24 h-24 object-cover shadow-xl shadow-slate-200 border-4 border-white'
				/>

				<div className="text-center sm:text-left">
					<h3 className='text-xl font-black text-slate-900 tracking-tight'>John Doe Admin</h3>
					<p className='text-slate-500 font-medium text-sm mt-0.5 italic'>john.doe@enterprise.com</p>
					<div className="mt-3 inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
						{role} Access Level
					</div>
				</div>
			</div>

			<button className='w-full sm:w-auto px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition duration-200 active:scale-95 text-sm shadow-xl shadow-indigo-100 border-2 border-transparent'>
				Modify Profile
			</button>
		</SettingSection>
	);
};
export default Profile;
