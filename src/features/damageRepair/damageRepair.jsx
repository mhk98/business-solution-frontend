import { baseApi } from "../baseApi/api";

export const damageRepairApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageRepair: build.mutation({
      query: (data) => ({
        url: "/damage-repair/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "DamageRepair", id: "LIST" },
        { type: "DamageProduct", id: "LIST" }, // ✅ receive stock affected
        { type: "DamageStock", id: "LIST" }, // ✅ receive stock affected
        { type: "DamageRepairingStock", id: "LIST" }, // ✅ receive stock affected
      ],
    }),

    deleteDamageRepair: build.mutation({
      query: (id) => ({
        url: `/damage-repair/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "DamageRepair", id },
        { type: "DamageRepair", id: "LIST" },

        { type: "DamageProduct", id: "LIST" }, // ✅ stock return/update
        { type: "DamageStock", id: "LIST" }, // ✅ stock return/update
        { type: "DamageRepairingStock", id: "LIST" }, // ✅ stock return/update
      ],
    }),

    updateDamageRepair: build.mutation({
      query: ({ id, data }) => ({
        url: `/damage-repair/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "DamageRepair", id: arg.id },
        { type: "DamageRepair", id: "LIST" },

        { type: "DamageProduct", id: "LIST" }, // ✅ if update changes qty/status
        { type: "DamageStock", id: "LIST" }, // ✅ if update changes qty/status
        { type: "DamageRepairingStock", id: "LIST" }, // ✅ if update changes qty/status
      ],
    }),

    getAllDamageRepair: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-repair/", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "DamageRepair", id: "LIST" },
              ...result.data.map((r) => ({
                type: "DamageRepair",
                id: r.Id,
              })),
            ]
          : [{ type: "DamageRepair", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllDamageRepairWithoutQuery: build.query({
      query: () => ({ url: "/damage-repair/all" }),
      providesTags: [{ type: "DamageRepair", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageRepairMutation,
  useGetAllDamageRepairQuery,
  useDeleteDamageRepairMutation,
  useUpdateDamageRepairMutation,
  useGetAllDamageRepairWithoutQueryQuery,
} = damageRepairApi;
