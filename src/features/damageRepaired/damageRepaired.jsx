import { baseApi } from "../baseApi/api";

export const damageRepairedApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageRepaired: build.mutation({
      query: (data) => ({
        url: "/damage-repaired/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "DamageRepaired", id: "LIST" },
        { type: "DamageProduct", id: "LIST" }, // ✅ receive stock affected
        { type: "DamageStock", id: "LIST" }, // ✅ receive stock affected
        { type: "InventoryOverview", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deleteDamageRepaired: build.mutation({
      query: (id) => ({
        url: `/damage-repaired/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "DamageRepaired", id },
        { type: "DamageRepaired", id: "LIST" },

        { type: "DamageProduct", id: "LIST" }, // ✅ stock return/update
        { type: "DamageStock", id: "LIST" }, // ✅ stock return/update
        { type: "InventoryOverview", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updateDamageRepaired: build.mutation({
      query: ({ id, data }) => ({
        url: `/damage-repaired/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "DamageRepaired", id: arg.id },
        { type: "DamageRepaired", id: "LIST" },

        { type: "DamageProduct", id: "LIST" }, // ✅ if update changes qty/status
        { type: "DamageStock", id: "LIST" }, // ✅ if update changes qty/status
        { type: "InventoryOverview", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllDamageRepaired: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-repaired/", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "DamageRepaired", id: "LIST" },
              ...result.data.map((r) => ({
                type: "DamageRepaired",
                id: r.Id,
              })),
            ]
          : [{ type: "DamageRepaired", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllDamageRepairedWithoutQuery: build.query({
      query: () => ({ url: "/damage-repaired/all" }),
      providesTags: [{ type: "DamageRepaired", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageRepairedMutation,
  useGetAllDamageRepairedQuery,
  useDeleteDamageRepairedMutation,
  useUpdateDamageRepairedMutation,
  useGetAllDamageRepairedWithoutQueryQuery,
} = damageRepairedApi;
