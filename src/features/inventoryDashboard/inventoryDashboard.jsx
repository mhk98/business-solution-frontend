// import { baseApi } from "../baseApi/api";

// export const inventorySummaryApi = baseApi.injectEndpoints({
//   endpoints: (build) => ({
//     getInventorySummary: build.query({
//       query: (arg = {}) => {
//         const { from, to } = arg;

//         const params = { from, to };
//         Object.keys(params).forEach((k) => {
//           if (params[k] === undefined || params[k] === null || params[k] === "")
//             delete params[k];
//         });

//         return { url: "/inventory/summary", params };
//       },

//       providesTags: [{ type: "InventorySummary", id: "LIST" }],
//       refetchOnMountOrArgChange: true,
//     }),
//   }),

//   overrideExisting: false,
// });

// export const { useGetInventorySummaryQuery } = inventorySummaryApi;

import { baseApi } from "../baseApi/api";

export const inventorySummaryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ✅ Summary (cards এর জন্য)
    getInventorySummary: build.query({
      query: (arg = {}) => {
        const { from, to } = arg;

        const params = { from, to };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/inventory/summary", params };
      },
      providesTags: [{ type: "InventorySummary", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    // ✅ List (UI table এর জন্য)
    getInventoryList: build.query({
      query: (arg = {}) => {
        const { from, to, name, source, page = 1, limit = 10 } = arg;

        const params = { from, to, name, source, page, limit };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/inventory/list", params };
      },
      providesTags: [{ type: "InventoryList", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const { useGetInventorySummaryQuery, useGetInventoryListQuery } =
  inventorySummaryApi;
