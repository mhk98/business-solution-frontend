import { UserCheck, UserPlus, UsersIcon, UserX } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import UsersTable from "../components/users/UsersTable";
import UserGrowthChart from "../components/users/UserGrowthChart";
import UserActivityHeatmap from "../components/users/UserActivityHeatmap";
import UserDemographicsChart from "../components/users/UserDemographicsChart";
import { useLayout } from "../context/LayoutContext";
import { translations } from "../utils/translations";

const userStats = {
  totalUsers: 152845,
  newUsersToday: 243,
  activeUsers: 98520,
  churnRate: "2.4%",
};

const UsersPage = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50">
      <Header title="User Analytics" />

      <main className="max-w-8xl mx-auto py-8 px-4 lg:px-8">
        {/* Page Title Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.community_insights}</h1>
          <p className="text-slate-500 text-base mt-2 font-medium max-w-2xl">
            {t.registry_data_view}
          </p>
        </div>

        {/* STATS */}
        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StatCard
            name={t.total_registry}
            icon={UsersIcon}
            value={userStats.totalUsers.toLocaleString()}
            iconBg="#EEF2FF"
            iconColor="#4F46E5"
          />
          <StatCard
            name={t.daily_growth}
            icon={UserPlus}
            value={`+${userStats.newUsersToday}`}
            iconBg="#ECFDF5"
            iconColor="#10B981"
          />
          <StatCard
            name={t.current_actives}
            icon={UserCheck}
            value={userStats.activeUsers.toLocaleString()}
            iconBg="#FFF7ED"
            iconColor="#F59E0B"
          />
          <StatCard
            name={t.attrition_rate}
            icon={UserX}
            value={userStats.churnRate}
            iconBg="#FEF2F2"
            iconColor="#EF4444"
          />
        </motion.div>

        {/* Dynamic Table Section */}
        <div className="mb-12">
          <UsersTable />
        </div>

        {/* USER CHARTS SECTION */}
        <div className="space-y-8 mt-12">
          <div className="border-t border-slate-200 pt-12 pb-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.engagement_visualization}</h2>
            <p className="text-slate-500 text-sm mt-1 font-medium italic">{t.advanced_usage_metrics}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
              <UserGrowthChart />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
              <UserActivityHeatmap />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
              <UserDemographicsChart />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};
export default UsersPage;
