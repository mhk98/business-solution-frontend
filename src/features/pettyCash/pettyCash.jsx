import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const pettyCashApi = createApi({
  reducerPath: "pettyCashApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["pettyCash"],
  endpoints: (build) => ({
    insertPettyCash: build.mutation({
      query: (data) => ({
        url: "/petty-cash/create",
        method: "POST",
        body: data, // FormData
      }),
      invalidatesTags: ["pettyCash"],
    }),

    updatePettyCash: build.mutation({
      query: ({ id, data }) => ({
        url: `/petty-cash/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["pettyCash"],
    }),

    deletePettyCash: build.mutation({
      query: (arg) => {
        const id = typeof arg === "object" ? arg.id : arg;
        const mode = typeof arg === "object" ? arg.mode : undefined;

        return {
          url: `/petty-cash/${id}`,
          method: "DELETE",
          params: mode ? { mode } : undefined,
        };
      },
      invalidatesTags: ["pettyCash"],
    }),

    approvePettyCash: build.mutation({
      query: (id) => ({
        url: `/petty-cash/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: ["pettyCash"],
    }),

    // ✅ FIXED: FILTER PARAMS PASSING
    getAllPettyCash: build.query({
      query: (arg) => {
        const {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          paymentMode,
          paymentStatus,
          status,
          category,
          bookId,
          mode,
        } = arg || {};

        const params = {
          page,
          limit,
          startDate,
          endDate,
          searchTerm,
          paymentMode,
          paymentStatus,
          status,
          category,
          bookId,
          mode,
        };

        // ✅ remove undefined/empty
        Object.keys(params).forEach((k) => {
          if (
            params[k] === undefined ||
            params[k] === null ||
            params[k] === ""
          ) {
            delete params[k];
          }
        });

        return {
          url: "/petty-cash",
          params,
        };
      },
      providesTags: ["pettyCash"],
      refetchOnMountOrArgChange: true,
      // ✅ pollingInterval off (debug এ সমস্যা করে)
      // pollingInterval: 1000,
    }),

    getAllPettyCashWithoutQuery: build.query({
      query: () => ({
        url: "/petty-cash/all",
      }),
      providesTags: ["pettyCash"],
      refetchOnMountOrArgChange: true,
      pollingInterval: 1000,
    }),
  }),
});

export const {
  useGetAllPettyCashQuery,
  useInsertPettyCashMutation,
  useUpdatePettyCashMutation,
  useDeletePettyCashMutation,
  useApprovePettyCashMutation,
  useGetAllPettyCashWithoutQueryQuery,
} = pettyCashApi;
