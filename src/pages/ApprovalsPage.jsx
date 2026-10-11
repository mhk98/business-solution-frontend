import Header from "../components/common/Header";
import ApprovalList from "../components/approval/ApprovalList";
import { useGetPendingApprovalsQuery } from "../features/approval/approval";

const ApprovalsPage = () => {
  const { data, isLoading } = useGetPendingApprovalsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const items = data?.data || [];
  const isApprover = data?.meta?.isApprover;

  return (
    <div className="flex-1 relative z-10">
      <Header title="Approvals" />

      <main className="max-w-8xl mx-auto py-6 px-4 lg:px-8 bg-slate-50 min-h-[calc(100vh-64px)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Waiting for approval</h2>
          <p className="mt-1 text-sm text-slate-500">
            Edits and deletes by staff, and back-dated entries. Approve to apply them (status becomes Active); reject to put
            the record back as it was.
          </p>
          <div className="mt-5">
            {isLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
            ) : isApprover === false ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Only admin, superAdmin or a department head can approve requests.
              </p>
            ) : (
              <ApprovalList items={items} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApprovalsPage;
