import { motion } from "framer-motion";

const SettingSection = ({ icon: Icon, title, children }) => {
	return (
		<motion.div
			className='bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm shadow-slate-200/50 mb-8'
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className='flex items-center gap-4 mb-6 border-b border-slate-50 pb-4'>
				<div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
					<Icon size={20} />
				</div>
				<h2 className='text-lg font-black text-slate-800 tracking-tight'>{title}</h2>
			</div>
			{children}
		</motion.div>
	);
};
export default SettingSection;
