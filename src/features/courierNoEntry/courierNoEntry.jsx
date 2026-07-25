import { baseApi } from "../baseApi/api";

export const courierNoEntryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertCourierNoEntry: build.mutation({
      query: (data) => ({
        url: "/courier-no-entry/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "CourierNoEntry", id: "LIST" }],
    }),

    deleteCourierNoEntry: build.mutation({
      query: (id) => ({
        url: `/courier-no-entry/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "CourierNoEntry", id },
        { type: "CourierNoEntry", id: "LIST" },
      ],
    }),

    updateCourierNoEntry: build.mutation({
      query: ({ id, data }) => ({
        url: `/courier-no-entry/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "CourierNoEntry", id: arg.id },
        { type: "CourierNoEntry", id: "LIST" },
      ],
    }),

    getAllCourierNoEntry: build.query({
      query: (arg = {}) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          name,
          courierStatus,
          searchTerm,
          sortBy,
          sortOrder,
        } = arg;
        const params = {
          page,
          limit,
          startDate,
          endDate,
          name,
          courierStatus,
          searchTerm,
          sortBy,
          sortOrder,
        };

        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return { url: "/courier-no-entry", params };
      },
      providesTags: (result) =>
        result?.data
          ? [
              { type: "CourierNoEntry", id: "LIST" },
              ...result.data.map((r) => ({
                type: "CourierNoEntry",
                id: r.Id,
              })),
            ]
          : [{ type: "CourierNoEntry", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllCourierNoEntryWithoutQuery: build.query({
      query: () => ({ url: "/courier-no-entry/all" }),
      providesTags: [{ type: "CourierNoEntry", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useInsertCourierNoEntryMutation,
  useGetAllCourierNoEntryQuery,
  useDeleteCourierNoEntryMutation,
  useUpdateCourierNoEntryMutation,
  useGetAllCourierNoEntryWithoutQueryQuery,
} = courierNoEntryApi;
