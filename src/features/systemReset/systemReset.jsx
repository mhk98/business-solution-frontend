import { baseApi } from "../baseApi/api";

export const systemResetApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    hardResetData: build.mutation({
      query: ({ mode }) => ({
        url: "/system-reset/data",
        method: "POST",
        body: {
          mode,
          confirmation: "HARD_DELETE",
        },
      }),
      invalidatesTags: ["Overview", "InventoryOverview", "ReceivedProduct"],
    }),
  }),
  overrideExisting: false,
});

export const { useHardResetDataMutation } = systemResetApi;
