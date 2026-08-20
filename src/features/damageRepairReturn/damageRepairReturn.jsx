import { baseApi } from "../baseApi/api";

export const damageRepairReturnApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageRepairReturn: build.mutation({
      query: (data) => ({
        url: "/damage-repair-return/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "DamageRepair", id: "LIST" },
        { type: "DamageRepairingStock", id: "LIST" },
      ],
    }),

    deleteDamageRepairReturn: build.mutation({
      query: (id) => ({
        url: `/damage-repair-return/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "DamageRepair", id: "LIST" },
        { type: "DamageRepairingStock", id: "LIST" },
      ],
    }),

    getAllDamageRepairReturn: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-repair-return/", params };
      },
      providesTags: [{ type: "DamageRepair", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageRepairReturnMutation,
  useGetAllDamageRepairReturnQuery,
  useDeleteDamageRepairReturnMutation,
} = damageRepairReturnApi;
