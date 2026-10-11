import { baseApi, TAG_TYPES } from "../baseApi/api";

// Approving or rejecting changes records in any module, so every list refetches.
const everyList = [...TAG_TYPES];

export const approvalApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPendingApprovals: build.query({
      query: () => ({ url: "approvals/pending" }),
      providesTags: ["Approvals"],
    }),
    approveRequest: build.mutation({
      query: (key) => ({ url: `approvals/${key}/approve`, method: "POST" }),
      invalidatesTags: everyList,
    }),
    rejectRequest: build.mutation({
      query: ({ key, note }) => ({ url: `approvals/${key}/reject`, method: "POST", body: { note } }),
      invalidatesTags: everyList,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPendingApprovalsQuery,
  useApproveRequestMutation,
  useRejectRequestMutation,
} = approvalApi;
