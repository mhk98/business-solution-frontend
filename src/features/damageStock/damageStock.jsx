import { baseApi } from "../baseApi/api";

export const damageStockApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageStock: build.mutation({
      query: (data) => ({
        url: "/damage-stock/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "DamageStock", id: "LIST" },
        { type: "InventoryOverview", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deleteDamageStock: build.mutation({
      query: (id) => ({
        url: `/damage-stock/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "DamageStock", id },
        { type: "DamageStock", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updateDamageStock: build.mutation({
      query: ({ id, data }) => ({
        url: `/damage-stock/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "DamageStock", id: arg.id },
        { type: "DamageStock", id: "LIST" },

        { type: "InventoryOverview", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllDamageStock: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-stock/", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "DamageStock", id: "LIST" },
              ...result.data.map((r) => ({
                type: "DamageStock",
                id: r.Id,
              })),
            ]
          : [{ type: "DamageStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllDamageStockWithoutQuery: build.query({
      query: () => ({ url: "/damage-stock/all" }),
      providesTags: [{ type: "DamageStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageStockMutation,
  useGetAllDamageStockQuery,
  useDeleteDamageStockMutation,
  useUpdateDamageStockMutation,
  useGetAllDamageStockWithoutQueryQuery,
} = damageStockApi;
