import { baseApi } from "../baseApi/api";

export const masterPermissionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyMasterPermission: build.query({
      query: () => ({
        url: "/master-permissions/self",
        method: "GET",
      }),
      providesTags: ["MasterPermission"],
    }),
    getMasterPermissions: build.query({
      query: () => ({
        url: "/master-permissions",
        method: "GET",
      }),
      providesTags: ["MasterPermission"],
    }),
    getMasterPermissionEmailOptions: build.query({
      query: () => ({
        url: "/master-permissions/email-options",
        method: "GET",
      }),
      providesTags: ["MasterPermission"],
    }),
    addMasterPermission: build.mutation({
      query: ({ email }) => ({
        url: "/master-permissions",
        method: "POST",
        body: { email },
      }),
      invalidatesTags: ["MasterPermission"],
    }),
    deleteMasterPermission: build.mutation({
      query: (id) => ({
        url: `/master-permissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MasterPermission"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyMasterPermissionQuery,
  useGetMasterPermissionsQuery,
  useGetMasterPermissionEmailOptionsQuery,
  useAddMasterPermissionMutation,
  useDeleteMasterPermissionMutation,
} = masterPermissionApi;
