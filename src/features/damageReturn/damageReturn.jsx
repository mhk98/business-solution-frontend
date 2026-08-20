import { baseApi } from "../baseApi/api";

export const damageReturnApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertDamageReturn: build.mutation({
      query: (data) => ({
        url: "/damage-return/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "DamageProduct", id: "LIST" },
        { type: "DamageStock", id: "LIST" },
      ],
    }),

    deleteDamageReturn: build.mutation({
      query: (id) => ({
        url: `/damage-return/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "DamageProduct", id: "LIST" },
        { type: "DamageStock", id: "LIST" },
      ],
    }),

    getAllDamageReturn: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, name, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, name, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/damage-return/", params };
      },
      providesTags: [{ type: "DamageProduct", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertDamageReturnMutation,
  useGetAllDamageReturnQuery,
  useDeleteDamageReturnMutation,
} = damageReturnApi;
