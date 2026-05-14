import { baseApi } from "../baseApi/api";

export const damageRepairingStockApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageRepairingStock: build.mutation({
      query: (data) => ({
        url: "/damage-repairing-stock/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "DamageRepairingStock", id: "LIST" }],
    }),

    deleteDamageRepairingStock: build.mutation({
      query: (id) => ({
        url: `/damage-repairing-stock/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "DamageRepairingStock", id },
        { type: "DamageRepairingStock", id: "LIST" },
      ],
    }),

    updateDamageRepairingStock: build.mutation({
      query: ({ id, data }) => ({
        url: `/damage-repairing-stock/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "DamageRepairingStock", id: arg.id },
        { type: "DamageRepairingStock", id: "LIST" },
      ],
    }),

    getAllDamageRepairingStock: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-repairing-stock/", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "DamageRepairingStock", id: "LIST" },
              ...result.data.map((r) => ({
                type: "DamageRepairingStock",
                id: r.Id,
              })),
            ]
          : [{ type: "DamageRepairingStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllDamageRepairingStockWithoutQuery: build.query({
      query: () => ({ url: "/damage-repairing-stock/all" }),
      providesTags: [{ type: "DamageRepairingStock", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageRepairingStockMutation,
  useGetAllDamageRepairingStockQuery,
  useDeleteDamageRepairingStockMutation,
  useUpdateDamageRepairingStockMutation,
  useGetAllDamageRepairingStockWithoutQueryQuery,
} = damageRepairingStockApi;
