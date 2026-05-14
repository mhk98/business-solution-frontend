import { useState } from "react";
import { motion } from "framer-motion";
import { Search, UserCheck, UserX, Edit, Trash2, X } from "lucide-react";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";

const userData = [
	{ id: 1, name: "John Doe", email: "john@example.com", role: "Customer", status: "Active" },
	{ id: 2, name: "Jane Smith", email: "jane@example.com", role: "Admin", status: "Active" },
	{ id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Customer", status: "Inactive" },
	{ id: 4, name: "Alice Brown", email: "alice@example.com", role: "Customer", status: "Active" },
	{ id: 5, name: "Charlie Wilson", email: "charlie@example.com", role: "Moderator", status: "Active" },
];

const UsersTable = () => {
	const { language } = useLayout();
	const t = translations[language] || translations.EN;
	const [searchTerm, setSearchTerm] = useState("");
	const [users, setUsers] = useState(userData);

	const handleSearch = (e) => {
		const term = e.target.value.toLowerCase();
		setSearchTerm(term);
		const filtered = userData.filter(
			(user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
		);
		setUsers(filtered);
	};

	return (
		<motion.div
			className="bg-white/90 backdrop-blur-md shadow-sm rounded-3xl p-4 sm:p-8 border border-slate-100 mb-8"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
				<div>
					<h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.active_users}</h2>
					<p className="text-slate-500 text-sm mt-1 font-medium">{t.manage_platform_access}</p>
				</div>

				<div className="relative w-full lg:max-w-md">
					<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
						<Search className="text-slate-400" size={18} />
					</div>
					<input
						type="text"
						placeholder={t.search_by_name_email}
						className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium"
						value={searchTerm}
						onChange={handleSearch}
					/>
					{searchTerm && (
						<button
							onClick={() => { setSearchTerm(""); setUsers(userData); }}
							className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			<div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-100">
						<thead className="bg-slate-50/50">
							<tr>
								<th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.user_identity}</th>
								<th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.contact_email}</th>
								<th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.account_role}</th>
								<th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.status}</th>
								<th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{t.actions}</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-slate-100">
							{users.map((user) => (
								<motion.tr
									key={user.id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="hover:bg-indigo-50/30 transition-colors group"
								>
									<td className="px-6 py-5 whitespace-nowrap">
										<div className="flex items-center">
											<div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
												{user.name.charAt(0)}
											</div>
											<div className="ml-4">
												<div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{user.name}</div>
											</div>
										</div>
									</td>

									<td className="px-6 py-5 whitespace-nowrap">
										<div className="text-sm text-slate-500 font-medium">{user.email}</div>
									</td>

									<td className="px-6 py-5 whitespace-nowrap">
										<span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm shadow-indigo-50">
											{user.role}
										</span>
									</td>

									<td className="px-6 py-5 whitespace-nowrap">
										<span
											className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-tighter shadow-sm border ${user.status === "Active"
												? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50"
												: "bg-rose-50 text-rose-700 border-rose-100 shadow-rose-50"
												}`}
										>
											{user.status === "Active" ? <UserCheck size={12} /> : <UserX size={12} />}
											{user.status === "Active" ? t.active : t.inactive}
										</span>
									</td>

									<td className="px-6 py-5 whitespace-nowrap text-center">
										<div className="flex items-center justify-center gap-2">
											<button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm active:scale-90">
												<Edit size={16} />
											</button>
											<button className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm active:scale-90">
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</motion.tr>
							))}
						</tbody>
					</table>

					{users.length === 0 && (
						<div className="py-20 text-center text-slate-400">
							<div className="text-4xl mb-4 opacity-20">🔍</div>
							<p className="font-bold text-sm italic">{t.no_users_matching} "{searchTerm}"</p>
						</div>
					)}
				</div>
			</div>
		</motion.div>
	);
};

export default UsersTable;
