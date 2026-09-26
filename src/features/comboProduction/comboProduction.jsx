import { baseApi } from "../baseApi/api";

// Combo Production entries are Mixer rows on the backend, so they share the
// "Mixer" tag type and refresh the same stock screens a Mixer entry does.
const STOCK_TAGS = [
  { type: "Mixer", id: "COMBO_LIST" },
  { type: "InventoryOverview", id: "LIST" },
  { type: "ItemMaster", id: "LIST" },
  { type: "Manufacturer", id: "LIST" },
];

export const comboProductionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getComboProductionCombos: build.query({
      query: () => ({ url: "combo-production/combos" }),
      providesTags: [{ type: "Mixer", id: "LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    getAllComboProduction: build.query({
      query: ({ page, limit, startDate, endDate, name }) => ({
        url: "combo-production",
        params: { page, limit, startDate, endDate, name },
      }),
      providesTags: [{ type: "Mixer", id: "COMBO_LIST" }],
      refetchOnMountOrArgChange: true,
    }),

    insertComboProduction: build.mutation({
      query: (data) => ({
        url: "combo-production/create",
        method: "POST",
        body: data,
      }),
      invalidatesTags: STOCK_TAGS,
    }),

    deleteComboProduction: build.mutation({
      query: (id) => ({
        url: `combo-production/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: STOCK_TAGS,
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetComboProductionCombosQuery,
  useGetAllComboProductionQuery,
  useInsertComboProductionMutation,
  useDeleteComboProductionMutation,
} = comboProductionApi;
