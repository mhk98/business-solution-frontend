import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const getAuthToken = () => localStorage.getItem("token");

export const shifaAppointmentSerialApi = createApi({
  reducerPath: "shifaAppointmentSerialApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/api/v1/`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["ShifaAppointmentSerial"],
  endpoints: (build) => ({
    createShifaAppointmentSerial: build.mutation({
      query: (data) => ({
        url: "/shifa-appointment-serials/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ShifaAppointmentSerial"],
    }),
    updateShifaAppointmentSerial: build.mutation({
      query: ({ id, data }) => ({
        url: `/shifa-appointment-serials/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ShifaAppointmentSerial"],
    }),
    deleteShifaAppointmentSerial: build.mutation({
      query: (id) => ({
        url: `/shifa-appointment-serials/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ShifaAppointmentSerial"],
    }),
    getShifaAppointmentSerials: build.query({
      query: (params = {}) => ({
        url: "/shifa-appointment-serials",
        params,
      }),
      providesTags: ["ShifaAppointmentSerial"],
      refetchOnMountOrArgChange: true,
    }),
  }),
});

export const {
  useCreateShifaAppointmentSerialMutation,
  useUpdateShifaAppointmentSerialMutation,
  useDeleteShifaAppointmentSerialMutation,
  useGetShifaAppointmentSerialsQuery,
} = shifaAppointmentSerialApi;
