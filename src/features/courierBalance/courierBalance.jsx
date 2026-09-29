import { baseApi } from "../baseApi/api";

export const courierBalanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertCourierBalance: build.mutation({
      query: (data) => ({
        url: "/courier-balance/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "CourierBalance", id: "LIST" }],
    }),

    updateCourierBalance: build.mutation({
      query: ({ id, data }) => ({
        url: `/courier-balance/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [{ type: "CourierBalance", id: "LIST" }],
    }),

    deleteCourierBalance: build.mutation({
      query: (id) => ({
        url: `/courier-balance/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "CourierBalance", id: "LIST" }],
    }),

    getAllCourierBalance: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, searchTerm };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });
        return { url: "/courier-balance", params };
      },
      providesTags: [{ type: "CourierBalance", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertCourierBalanceMutation,
  useUpdateCourierBalanceMutation,
  useDeleteCourierBalanceMutation,
  useGetAllCourierBalanceQuery,
} = courierBalanceApi;
