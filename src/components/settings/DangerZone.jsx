import { motion } from "framer-motion";
import { Trash2, AlertTriangle } from "lucide-react";

const DangerZone = () => {
	return (
		<motion.div
			className='bg-rose-50 rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-sm shadow-rose-100/50 mb-8 overflow-hidden relative group'
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
				<AlertTriangle size={120} className="text-rose-600" />
			</div>

			<div className='flex items-center gap-4 mb-4 relative z-10'>
				<div className="h-10 w-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 border border-rose-200/50">
					<Trash2 size={20} />
				</div>
				<h2 className='text-lg font-black text-rose-900 tracking-tight'>Destructive Actions</h2>
			</div>
			<p className='text-rose-600/70 mb-8 text-sm font-medium italic relative z-10'>Warning: These operations are irreversible. Initiating a system purge will permanently remove all associated record clusters.</p>

			<button
				className='relative z-10 w-full sm:w-auto px-10 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl transition duration-200 active:scale-95 shadow-xl shadow-rose-100'
			>
				Purge System Account
			</button>
		</motion.div>
	);
};
export default DangerZone;
