import { baseApi } from "../baseApi/api";

export const salaryAdvanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertSalaryAdvance: build.mutation({
      query: (data) => ({
        url: "/salary-advance/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "SalaryAdvance", id: "LIST" }],
    }),

    updateSalaryAdvance: build.mutation({
      query: ({ id, data }) => ({
        url: `/salary-advance/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "SalaryAdvance", id: arg.id },
        { type: "SalaryAdvance", id: "LIST" },
      ],
    }),

    deleteSalaryAdvance: build.mutation({
      query: (id) => ({
        url: `/salary-advance/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "SalaryAdvance", id },
        { type: "SalaryAdvance", id: "LIST" },
      ],
    }),

    paySalaryAdvance: build.mutation({
      query: ({ id, data }) => ({
        url: `/salary-advance/${id}/pay`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "SalaryAdvance", id: arg.id },
        { type: "SalaryAdvance", id: "LIST" },
      ],
    }),

    getAllSalaryAdvance: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm } = arg;
        const params = { page, limit, startDate, endDate, searchTerm };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/salary-advance", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "SalaryAdvance", id: "LIST" },
              ...result.data.map((r) => ({ type: "SalaryAdvance", id: r.Id })),
            ]
          : [{ type: "SalaryAdvance", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllSalaryAdvanceWithoutQuery: build.query({
      query: () => ({ url: "/salary-advance/all" }),
      providesTags: [{ type: "SalaryAdvance", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertSalaryAdvanceMutation,
  useUpdateSalaryAdvanceMutation,
  useDeleteSalaryAdvanceMutation,
  usePaySalaryAdvanceMutation,
  useGetAllSalaryAdvanceQuery,
  useGetAllSalaryAdvanceWithoutQueryQuery,
} = salaryAdvanceApi;
