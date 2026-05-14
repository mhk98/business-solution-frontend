// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// // Helper function to get the auth token
// const getAuthToken = () => {
//   return localStorage.getItem("token"); // Modify this based on your token storage logic
// };

// export const marketingBookApi = createApi({
//   reducerPath: "marketingBookApi",
//   baseQuery: fetchBaseQuery({
//     baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
//     prepareHeaders: (headers) => {
//       const token = getAuthToken(); // Fetch the token
//       if (token) {
//         // If the token exists, add it to the headers
//         headers.set("Authorization", `Bearer ${token}`);
//       }
//       return headers;
//     },
//   }),

//   tagTypes: ["marketingBook"], // Define the tag type for invalidation and refetching
//   endpoints: (build) => ({
//     insertMarketingBook: build.mutation({
//       query: (data) => ({
//         url: "/marketing-book/create",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["book"], // Invalidate the Book tag after this mutation
//     }),

//     deleteMarketingBook: build.mutation({
//       query: (id) => ({
//         url: `/marketing-book/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["marketingBook"], // Invalidate the Book tag after deletion
//     }),

//     updateMarketingBook: build.mutation({
//       query: ({ id, data }) => ({
//         url: `/marketing-book/${id}`,
//         method: "PUT",
//         body: data,
//       }),
//       invalidatesTags: ["marketingBook"], // Invalidate the Book tag after this mutation
//     }),

//     getAllMarketingBook: build.query({
//       query: ({
//         page,
//         limit,
//         startDate,
//         endDate,
//         bookId,
//         searchTerm,
//         paymentMode,
//         paymentStatus,
//       }) => ({
//         url: "/book",
//         params: {
//           page,
//           limit,
//           startDate,
//           endDate,
//           bookId,
//           searchTerm,
//           paymentMode,
//           paymentStatus,
//         },
//       }),
//       providesTags: ["book"],
//       refetchOnMountOrArgChange: true,
//       // pollingInterval: 1000,  // ❌ remove
//     }),

//     getAllBookWithoutQuery: build.query({
//       query: () => ({
//         url: "/marketing-book/all",
//       }),
//       providesTags: ["marketingBook"],
//       refetchOnMountOrArgChange: true,
//       pollingInterval: 1000,
//     }),
//     getSingleMarketingBookDataById: build.query({
//       query: (id) => ({
//         url: `/marketing-book/${id}`,
//       }),
//       providesTags: ["marketingBook"], // Provides the 'supplier' tag for caching and invalidation
//     }),
//   }),
// });

// export const {
//   useGetAllMarketingBookQuery,
//   useGetAllBookWithoutQueryQuery,
//   useGetSingleMarketingBookDataByIdQuery,
//   useDeleteMarketingBookMutation,
//   useUpdateMarketingBookMutation,
//   useInsertMarketingBookMutation,
// } = marketingBookApi;

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const marketingBookApi = createApi({
  reducerPath: "marketingBookApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  tagTypes: ["MarketingBook"],

  endpoints: (build) => ({
    insertMarketingBook: build.mutation({
      query: (data) => ({
        url: "/marketing-book/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "MarketingBook", id: "LIST" }],
    }),

    deleteMarketingBook: build.mutation({
      query: (id) => ({
        url: `/marketing-book/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (res, err, id) => [
        { type: "MarketingBook", id },
        { type: "MarketingBook", id: "LIST" },
      ],
    }),

    updateMarketingBook: build.mutation({
      query: ({ id, data }) => ({
        url: `/marketing-book/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "MarketingBook", id: arg.id },
        { type: "MarketingBook", id: "LIST" },
      ],
    }),

    // ✅ LIST (Paginated + search)
    getAllMarketingBook: build.query({
      query: (arg = {}) => {
        const { page, limit, startDate, endDate, searchTerm } = arg;

        const params = { page, limit, startDate, endDate, searchTerm };
        Object.keys(params).forEach((k) => {
          if (params[k] === undefined || params[k] === null || params[k] === "")
            delete params[k];
        });

        return {
          url: "/marketing-book",
          params,
        };
      },

      providesTags: (result) => {
        const rows = result?.data;
        if (Array.isArray(rows) && rows.length) {
          return [
            { type: "MarketingBook", id: "LIST" },
            ...rows.map((r) => ({
              type: "MarketingBook",
              id: r.Id ?? r.id,
            })),
          ];
        }
        return [{ type: "MarketingBook", id: "LIST" }];
      },

      refetchOnMountOrArgChange: true,
    }),

    getAllMarketingBookWithoutQuery: build.query({
      query: () => ({ url: "/marketing-book/all" }),
      providesTags: [{ type: "MarketingBook", id: "LIST" }],
      refetchOnMountOrArgChange: true,
      // pollingInterval: 1000, // দরকার না হলে off
    }),

    getSingleMarketingBookDataById: build.query({
      query: (id) => ({ url: `/marketing-book/${id}` }),
      providesTags: (res, err, id) => [{ type: "MarketingBook", id }],
    }),
  }),
});

export const {
  useGetAllMarketingBookQuery,
  useGetAllMarketingBookWithoutQueryQuery,
  useGetSingleMarketingBookDataByIdQuery,
  useDeleteMarketingBookMutation,
  useUpdateMarketingBookMutation,
  useInsertMarketingBookMutation,
} = marketingBookApi;
