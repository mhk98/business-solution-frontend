// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { baseApi } from "../baseApi/api";

export const mixerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    insertMixer: build.mutation({
      query: (data) => ({
        url: "mixer/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Mixer", id: "LIST" }],
    }),

    deleteMixer: build.mutation({
      query: (id) => ({
        url: `mixer/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Mixer", id: "LIST" }],
    }),

    updateMixer: build.mutation({
      query: ({ id, data }) => ({
        url: `mixer/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, arg) => [
        { type: "Mixer", id: "LIST" },
        { type: "Manufacture", id: arg.id },
      ],
    }),

    getAllMixer: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "mixer",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: "Mixer", id: "LIST" },
              ...result.data.map((r) => ({ type: "Mixer", id: r.Id })),
            ]
          : [{ type: "Mixer", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllMixerWithoutQuery: build.query({
      query: () => ({
        url: "mixer/all",
      }),
      providesTags: [{ type: "Mixer", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),
  }),

  overrideExisting: false,
});

export const {
  useInsertMixerMutation,
  useGetAllMixerQuery,
  useDeleteMixerMutation,
  useUpdateMixerMutation,
  useGetAllMixerWithoutQueryQuery,
} = mixerApi;
