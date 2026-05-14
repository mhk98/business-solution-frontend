const ToggleSwitch = ({ label, isOn, onToggle }) => {
	return (
		<div className='flex items-center justify-between py-4 group cursor-pointer' onClick={onToggle}>
			<span className='text-slate-600 font-bold text-sm tracking-tight group-hover:text-slate-900 transition-colors'>{label}</span>
			<button
				className={`
        relative inline-flex items-center h-7 rounded-full w-12 transition-all focus:outline-none shadow-inner
        ${isOn ? "bg-indigo-600 shadow-indigo-200" : "bg-slate-200 shadow-slate-300"}
        `}
				type="button"
			>
				<span
					className={`inline-block size-5 transform transition-all bg-white rounded-full shadow-lg
            ${isOn ? "translate-x-6" : "translate-x-1"}
            `}
				/>
			</button>
		</div>
	);
};
export default ToggleSwitch;
