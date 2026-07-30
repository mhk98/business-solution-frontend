import { baseApi } from "../baseApi/api";

export const systemResetApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    hardResetData: build.mutation({
      query: ({ mode, percentage }) => ({
        url: "/system-reset/data",
        method: "POST",
        body: {
          mode,
          percentage,
          confirmation: "HARD_DELETE",
        },
      }),
      invalidatesTags: ["Overview", "InventoryOverview", "ReceivedProduct"],
    }),
  }),
  overrideExisting: true,
});

export const { useHardResetDataMutation } = systemResetApi;
