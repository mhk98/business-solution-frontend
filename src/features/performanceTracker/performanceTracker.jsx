import { baseApi } from "../baseApi/api";

const cleanParams = (params = {}) => {
  const cleaned = { ...params };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === "") {
      delete cleaned[key];
    }
  });
  return cleaned;
};

export const performanceTrackerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPerformanceTrackerDashboard: build.query({
      query: (params = {}) => ({
        url: "/performance-tracker/dashboard",
        params: cleanParams(params),
      }),
      providesTags: [{ type: "PerformanceTracker", id: "DASHBOARD" }],
      refetchOnMountOrArgChange: true,
    }),
    getPerformanceTrackerCompare: build.query({
      query: (params = {}) => ({
        url: "/performance-tracker/compare",
        params: cleanParams(params),
      }),
      providesTags: [{ type: "PerformanceTracker", id: "COMPARE" }],
      refetchOnMountOrArgChange: true,
    }),
    getPerformanceTrackerChannels: build.query({
      query: (params = {}) => ({
        url: "/performance-tracker/channels",
        params: cleanParams(params),
      }),
      providesTags: [{ type: "PerformanceTracker", id: "CHANNELS" }],
      refetchOnMountOrArgChange: true,
    }),
    getAllPerformanceTrackerChannels: build.query({
      query: () => ({ url: "/performance-tracker/channels/all" }),
      providesTags: [{ type: "PerformanceTracker", id: "CHANNELS" }],
      refetchOnMountOrArgChange: true,
    }),
    createPerformanceTrackerChannel: build.mutation({
      query: (data) => ({
        url: "/performance-tracker/channels/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "PerformanceTracker", id: "CHANNELS" }],
    }),
    updatePerformanceTrackerChannel: build.mutation({
      query: ({ id, data }) => ({
        url: `/performance-tracker/channels/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [{ type: "PerformanceTracker", id: "CHANNELS" }],
    }),
    deletePerformanceTrackerChannel: build.mutation({
      query: (id) => ({
        url: `/performance-tracker/channels/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "PerformanceTracker", id: "CHANNELS" }],
    }),
    getPerformanceTrackerEntries: build.query({
      query: (params = {}) => ({
        url: "/performance-tracker/entries",
        params: cleanParams(params),
      }),
      providesTags: [{ type: "PerformanceTracker", id: "ENTRIES" }],
      refetchOnMountOrArgChange: true,
    }),
    createPerformanceTrackerEntry: build.mutation({
      query: (data) => ({
        url: "/performance-tracker/entries/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "PerformanceTracker", id: "ENTRIES" },
        { type: "PerformanceTracker", id: "DASHBOARD" },
        { type: "PerformanceTracker", id: "COMPARE" },
      ],
    }),
    updatePerformanceTrackerEntry: build.mutation({
      query: ({ id, data }) => ({
        url: `/performance-tracker/entries/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [
        { type: "PerformanceTracker", id: "ENTRIES" },
        { type: "PerformanceTracker", id: "DASHBOARD" },
        { type: "PerformanceTracker", id: "COMPARE" },
      ],
    }),
    deletePerformanceTrackerEntry: build.mutation({
      query: (id) => ({
        url: `/performance-tracker/entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "PerformanceTracker", id: "ENTRIES" },
        { type: "PerformanceTracker", id: "DASHBOARD" },
        { type: "PerformanceTracker", id: "COMPARE" },
      ],
    }),
    getPerformanceTrackerTargets: build.query({
      query: () => ({ url: "/performance-tracker/targets" }),
      providesTags: [{ type: "PerformanceTracker", id: "TARGETS" }],
      refetchOnMountOrArgChange: true,
    }),
    savePerformanceTrackerTargets: build.mutation({
      query: (targets) => ({
        url: "/performance-tracker/targets",
        method: "PUT",
        body: { targets },
      }),
      invalidatesTags: [
        { type: "PerformanceTracker", id: "TARGETS" },
        { type: "PerformanceTracker", id: "DASHBOARD" },
        { type: "PerformanceTracker", id: "COMPARE" },
      ],
    }),
  }),
});

export const {
  useGetPerformanceTrackerDashboardQuery,
  useGetPerformanceTrackerCompareQuery,
  useGetPerformanceTrackerChannelsQuery,
  useGetAllPerformanceTrackerChannelsQuery,
  useCreatePerformanceTrackerChannelMutation,
  useUpdatePerformanceTrackerChannelMutation,
  useDeletePerformanceTrackerChannelMutation,
  useGetPerformanceTrackerEntriesQuery,
  useCreatePerformanceTrackerEntryMutation,
  useUpdatePerformanceTrackerEntryMutation,
  useDeletePerformanceTrackerEntryMutation,
  useGetPerformanceTrackerTargetsQuery,
  useSavePerformanceTrackerTargetsMutation,
} = performanceTrackerApi;
