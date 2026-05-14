import Header from "../components/common/Header";
import MixerTable from "../components/mixer/MixerTable";

const MixerPage = () => {
  return (
    <div className="flex-1 relative z-10">
      <Header title="Mixer" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <MixerTable />
      </main>
    </div>
  );
};
export default MixerPage;
