import { motion } from "framer-motion";
import { Edit, Notebook, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import {
  useDeleteDamageRepairMutation,
  useGetAllDamageRepairQuery,
  useInsertDamageRepairMutation,
  useUpdateDamageRepairMutation,
} from "../../features/damageRepair/damageRepair";
import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import { useGetAllDamageStockWithoutQueryQuery } from "../../features/damageStock/damageStock";
import { useGetSingleReceivedProductByIdQuery } from "../../features/product/product";
import Modal from "../common/Modal";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const initialCreateForm = {
  warehouseId: "",
  supplierId: "",
  receivedId: "",
  productId: "",
  variantRows: [{ size: "", color: "", quantity: "" }],
  quantity: "",
  note: "",
  remarks: "",
  date: new Date().toISOString().slice(0, 10),
};

const parseVariationValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const getVariationOptions = (product, key) => {
  if (!Array.isArray(product?.variations)) return [];

  return [
    ...new Set(
      product.variations.flatMap((variation) =>
        parseVariationValue(variation?.[key]),
      ),
    ),
  ].map((value) => ({
    value,
    label: value,
  }));
};

const getVariantRowsFromProduct = (product) => {
  if (!Array.isArray(product?.variations)) return [];

  return product.variations.flatMap((variation) => {
    const sizes = parseVariationValue(variation?.size);
    const colors = parseVariationValue(variation?.color);

    if (sizes.length === 0 && colors.length === 0) return [];

    const safeSizes = sizes.length ? sizes : [""];
    const safeColors = colors.length ? colors : [""];

    return safeSizes.flatMap((size) =>
      safeColors.map((color) => ({ size, color, quantity: "" })),
    );
  });
};

const createEmptyVariantRow = () => ({
  size: "",
  color: "",
  quantity: "",
});

const normalizeVariantRows = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((row) => ({
      size: row?.size ? String(row.size) : "",
      color: row?.color ? String(row.color) : "",
      quantity:
        row?.quantity !== undefined && row?.quantity !== null
          ? String(row.quantity)
          : "",
    }));
  }

  return [createEmptyVariantRow()];
};

const getInitialVariantRowsFromRecord = (record) => {
  if (Array.isArray(record?.variants) && record.variants.length > 0) {
    return normalizeVariantRows(record.variants);
  }

  if (typeof record?.variants === "string") {
    try {
      const parsed = JSON.parse(record.variants);
      return normalizeVariantRows(parsed);
    } catch {
      // ignore malformed legacy data
    }
  }

  if (record?.size || record?.color || record?.variationQuantity) {
    return normalizeVariantRows([
      {
        size: record.size,
        color: record.color,
        quantity: record.variationQuantity,
      },
    ]);
  }

  return [createEmptyVariantRow()];
};

const getVariantDisplayRows = (record) => {
  if (Array.isArray(record?.variants)) {
    return record.variants.filter(
      (item) => item && (item.size || item.color || item.quantity),
    );
  }

  if (typeof record?.variants === "string") {
    try {
      const parsed = JSON.parse(record.variants);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => item && (item.size || item.color || item.quantity),
        );
      }
    } catch {
      return [];
    }
  }

  return [];
};

const getVariationColorsForSize = (product, size) => {
  if (!size || !Array.isArray(product?.variations)) return [];

  return [
    ...new Set(
      product.variations.flatMap((variation) => {
        const sizes = parseVariationValue(variation?.size);
        if (!sizes.includes(size)) return [];
        return parseVariationValue(variation?.color);
      }),
    ),
  ].map((value) => ({ value, label: value }));
};

const getNormalizedVariantsPayload = (rows) =>
  normalizeVariantRows(rows)
    .filter((row) => row.size || row.color || row.quantity)
    .map((row) => ({
      size: row.size || "",
      color: row.color || "",
      quantity: Number(row.quantity) || 0,
    }))
    .filter((row) => row.size);

const getVariantRowsTotalQuantity = (rows) =>
  normalizeVariantRows(rows).reduce(
    (total, row) => total + (Number(row.quantity) || 0),
    0,
  );

const hasConfiguredVariants = (rows) =>
  Array.isArray(rows) &&
  rows.some(
    (row) =>
      row &&
      (String(row.size || "").trim() ||
        String(row.color || "").trim() ||
        String(row.quantity || "").trim()),
  );

const hasDuplicateVariantCombination = (rows) => {
  const seen = new Set();

  for (const row of rows) {
    if (!row.size) continue;
    const key = `${row.size}__${row.color || ""}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }

  return false;
};

const getVariantKey = (variant) =>
  `${String(variant?.size || "").trim()}__${String(variant?.color || "").trim()}`;

const validateVariantSelection = (stockRecord, variantsPayload, quantity) => {
  const availableVariants = getVariantDisplayRows(stockRecord);
  if (availableVariants.length === 0) return true;

  if (variantsPayload.length === 0) {
    toast.error("Please select variants for this damage stock");
    return false;
  }

  const totalVariantQuantity = variantsPayload.reduce(
    (total, variant) => total + (Number(variant.quantity) || 0),
    0,
  );

  if (totalVariantQuantity !== Number(quantity || 0)) {
    toast.error("Variant quantity must match total quantity");
    return false;
  }

  const availableByVariant = new Map(
    availableVariants.map((variant) => [
      getVariantKey(variant),
      Number(variant.quantity || 0),
    ]),
  );

  for (const variant of variantsPayload) {
    const availableQuantity = availableByVariant.get(getVariantKey(variant));
    if (!availableQuantity) {
      toast.error("Selected variant is not available in damage stock");
      return false;
    }

    if (Number(variant.quantity || 0) > availableQuantity) {
      toast.error("Variant quantity exceeds available damage stock");
      return false;
    }
  }

  return true;
};

const DamageRepairTable = () => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditOpen1, setIsEditOpen1] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const [currentItem, setCurrentItem] = useState(null);

  // create form
  const [createForm, setCreateForm] = useState({
    ...initialCreateForm,
  });
  const [createItems, setCreateItems] = useState([]);

  const [rows, setRows] = useState([]);

  // filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  // ✅ pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // ✅ all damage products (for dropdown)
  const {
    data: receivedRes,
    isLoading: receivedLoading,
    isError: receivedError,
    error: receivedErrObj,
  } = useGetAllDamageStockWithoutQueryQuery();

  const receivedData = receivedRes?.data || [];

  useEffect(() => {
    if (receivedError)
      console.error("DamageProduct fetch error:", receivedErrObj);
  }, [receivedError, receivedErrObj]);

  // dropdown options -> value = DamageProduct.Id
  const receivedDropdownOptions = useMemo(() => {
    return receivedData.map((r) => ({
      value: String(r.Id),
      label: r.name,
    }));
  }, [receivedData]);

  const selectedCreateDamageStock = useMemo(
    () =>
      receivedData.find(
        (item) => String(item.Id) === String(createForm?.receivedId),
      ),
    [receivedData, createForm?.receivedId],
  );
  const selectedEditDamageStock = useMemo(
    () =>
      receivedData.find(
        (item) => String(item.Id) === String(currentItem?.receivedId),
      ),
    [receivedData, currentItem?.receivedId],
  );

  const selectedCreateProductId =
    selectedCreateDamageStock?.productId || createForm?.productId || undefined;
  const selectedEditProductId =
    selectedEditDamageStock?.productId || currentItem?.productId || undefined;

  const {
    data: selectedCreateProductRes,
    isFetching: isFetchingCreateProduct,
  } = useGetSingleReceivedProductByIdQuery(selectedCreateProductId, {
    skip: !selectedCreateProductId,
  });
  const { data: selectedEditProductRes, isFetching: isFetchingEditProduct } =
    useGetSingleReceivedProductByIdQuery(selectedEditProductId, {
      skip: !selectedEditProductId,
    });

  const rawSelectedCreateProductData =
    selectedCreateProductRes?.data || selectedCreateProductRes;
  const rawSelectedEditProductData =
    selectedEditProductRes?.data || selectedEditProductRes;
  const selectedCreateProductData =
    String(rawSelectedCreateProductData?.Id || "") ===
    String(selectedCreateProductId || "")
      ? rawSelectedCreateProductData
      : null;
  const selectedEditProductData =
    String(rawSelectedEditProductData?.Id || "") ===
    String(selectedEditProductId || "")
      ? rawSelectedEditProductData
      : null;

  const createSizeOptions = useMemo(
    () => getVariationOptions(selectedCreateProductData, "size"),
    [selectedCreateProductData],
  );
  const createColorOptions = useMemo(
    () => getVariationOptions(selectedCreateProductData, "color"),
    [selectedCreateProductData],
  );
  const shouldShowCreateVariantOptions = useMemo(
    () =>
      !isFetchingCreateProduct &&
      getVariantRowsFromProduct(selectedCreateProductData).length > 0,
    [isFetchingCreateProduct, selectedCreateProductData],
  );
  const editSizeOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "size"),
    [selectedEditProductData],
  );
  const editColorOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "color"),
    [selectedEditProductData],
  );
  const shouldShowEditVariantOptions = useMemo(
    () =>
      hasConfiguredVariants(currentItem?.variantRows) ||
      (!isFetchingEditProduct &&
        getVariantRowsFromProduct(selectedEditProductData).length > 0),
    [currentItem?.variantRows, isFetchingEditProduct, selectedEditProductData],
  );

  useEffect(() => {
    if (
      !createForm?.receivedId ||
      !selectedCreateProductData ||
      createSizeOptions.length > 0
    )
      return;

    if (hasConfiguredVariants(createForm?.variantRows)) {
      setCreateForm((p) => ({
        ...p,
        variantRows: [createEmptyVariantRow()],
        quantity: "",
      }));
    }
  }, [createForm?.receivedId, selectedCreateProductData, createSizeOptions.length]);

  useEffect(() => {
    if (
      !currentItem?.receivedId ||
      !selectedEditProductData ||
      editSizeOptions.length > 0
    )
      return;

    if (hasConfiguredVariants(currentItem?.variantRows)) {
      setCurrentItem((p) => ({
        ...p,
        variantRows: [createEmptyVariantRow()],
        quantity: "",
      }));
    }
  }, [currentItem?.receivedId, selectedEditProductData, editSizeOptions.length]);

  // ✅ react-select light styles
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
      backgroundColor: "#fff",
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    singleValue: (base) => ({ ...base, color: "#0f172a" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      zIndex: 40,
    }),
  };

  // ✅ responsive pagesPerSet
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // reset page when filters / perPage change
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, productName, itemsPerPage]);

  // fix endDate if startDate > endDate
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ query
  const queryArgs = {
    page: currentPage,
    limit: itemsPerPage,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    name: productName || undefined,
  };

  const { data, isLoading, isError, error, refetch } =
    useGetAllDamageRepairQuery(queryArgs);

  useEffect(() => {
    if (isError) console.error("DamageRepair fetch error:", error);
    if (!isLoading && data) {
      setRows(data?.data ?? []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // ✅ Table product name (simple)
  const resolveProductName = (rp) => {
    if (rp?.name) return rp.name;

    const productId = rp?.productId;
    if (!productId) return "N/A";

    const match = receivedData.find(
      (r) => Number(r.productId) === Number(productId),
    );
    return match?.name || "N/A";
  };

  // modals
  const openAdd = () => {
    setCreateForm(initialCreateForm);
    setCreateItems([]);
    setIsAddOpen(true);
  };
  const closeAdd = () => {
    setIsAddOpen(false);
    setCreateForm(initialCreateForm);
    setCreateItems([]);
  };

  const updateVariantRow = (mode, index, key, value) => {
    const setter = mode === "edit" ? setCurrentItem : setCreateForm;

    setter((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).map(
        (row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                [key]: value,
                ...(key === "size" ? { color: "" } : {}),
              }
            : row,
      );

      return {
        ...prev,
        variantRows: nextRows,
        quantity: String(getVariantRowsTotalQuantity(nextRows)),
      };
    });
  };

  const addVariantRow = (mode) => {
    const setter = mode === "edit" ? setCurrentItem : setCreateForm;

    setter((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
      quantity: String(getVariantRowsTotalQuantity(prev?.variantRows)),
    }));
  };

  const removeVariantRow = (mode, index) => {
    const setter = mode === "edit" ? setCurrentItem : setCreateForm;

    setter((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).filter(
        (_, rowIndex) => rowIndex !== index,
      );

      return {
        ...prev,
        variantRows: nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
        quantity: String(
          getVariantRowsTotalQuantity(
            nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
          ),
        ),
      };
    });
  };

  const openEdit = (rp) => {
    const variantRows = getInitialVariantRowsFromRecord(rp);
    setCurrentItem({
      ...rp,
      productId: String(rp.productId ?? ""),
      receivedId: String(rp.receivedId ?? rp.productId ?? ""),
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
      note: rp.note ?? "",
      status: rp.status ?? "",
      remarks: rp.remarks ?? "",
      date: rp.date ?? "",
    });
    setIsEditOpen(true);
  };
  const closeEdit = () => {
    setIsEditOpen(false);
    setCurrentItem(null);
  };

  const openEdit1 = (rp) => {
    setCurrentItem({
      ...rp,
      productId: String(rp.productId ?? ""),
      receivedId: String(rp.receivedId ?? rp.productId ?? ""),
      quantity: rp.quantity ?? "",
      note: rp.note ?? "",
      status: rp.status ?? "",
      remarks: rp.remarks ?? "",
    });
    setIsEditOpen1(true);
  };
  const closeEdit1 = () => {
    setIsEditOpen1(false);
    setCurrentItem(null);
  };

  // mutations
  const [insertDamageRepair] = useInsertDamageRepairMutation();
  const [updateDamageRepair] = useUpdateDamageRepairMutation();
  const [deleteDamageRepair] = useDeleteDamageRepairMutation();

  const buildCreatePayload = () => {
    if (!createForm.receivedId && !createForm.productId)
      return { error: "Please select a product" };
    if (!createForm.quantity || Number(createForm.quantity) <= 0)
      return { error: "Please enter valid quantity" };

    const variantsPayload = getNormalizedVariantsPayload(
      createForm.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }
    if (
      createSizeOptions.length > 0 &&
      !validateVariantSelection(
        selectedCreateDamageStock,
        variantsPayload,
        createForm.quantity,
      )
    ) {
      return { error: "Invalid variant quantity" };
    }

    const productId = String(createForm.receivedId || createForm.productId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === productId,
    );

    return {
      payload: {
        receivedId: Number(createForm.receivedId || createForm.productId),
        productId: Number(createForm.productId || selectedCreateProductId || 0),
        supplierId: Number(createForm.supplierId),
        warehouseId: Number(createForm.warehouseId),
        quantity: Number(createForm.quantity),
        variants: variantsPayload,
        note: createForm.note,
        remarks: createForm.remarks,
        date: createForm.date,
      },
      label: selectedProduct?.label || `Product #${productId}`,
    };
  };

  const resetCreateProductFields = () => {
    setCreateForm((prev) => ({
      ...prev,
      receivedId: "",
      productId: "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
    }));
  };

  const applyCreateGlobalFields = (payload) => ({
    ...payload,
    supplierId: Number(createForm.supplierId),
    warehouseId: Number(createForm.warehouseId),
    note: createForm.note,
    remarks: createForm.remarks,
    date: createForm.date,
  });

  const mergeCreateItem = (incomingItem) => {
    setCreateItems((prev) => {
      const incomingReceivedId = String(incomingItem.payload?.receivedId || "");
      const existingIndex = prev.findIndex(
        (item) => String(item.payload?.receivedId || "") === incomingReceivedId,
      );

      if (existingIndex === -1) return [...prev, incomingItem];

      return prev.map((item, index) => {
        if (index !== existingIndex) return item;

        return {
          ...item,
          label: incomingItem.label || item.label,
          payload: {
            ...item.payload,
            ...incomingItem.payload,
            quantity:
              Number(item.payload?.quantity || 0) ||
              Number(incomingItem.payload?.quantity || 0),
          },
        };
      });
    });
  };

  const handleAddCreateItem = () => {
    const item = buildCreatePayload();
    if (item.error) return toast.error(item.error);
    mergeCreateItem(item);
    resetCreateProductFields();
    toast.success("Product added to list");
  };

  const preserveCurrentCreateItem = () => {
    if (!createForm.receivedId && !createForm.productId) return;
    if (!createForm.quantity || Number(createForm.quantity) <= 0) return;

    const item = buildCreatePayload();
    if (item.error) return;
    mergeCreateItem(item);
    toast.success("Previous product added to list");
  };

  const createItemsTotalQuantity = useMemo(
    () => createItems.reduce((total, item) => total + (Number(item.payload?.quantity) || 0), 0),
    [createItems],
  );

  const updateCreateItem = (index, key, value) => {
    setCreateItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, payload: { ...item.payload, [key]: value } }
          : item,
      ),
    );
  };

  const updateCreateItemVariantField = (itemIndex, variantIndex, key, value) => {
    setCreateItems((prev) =>
      prev.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) return item;
        const nextVariants = (item.payload?.variants || []).map(
          (variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex
              ? { ...variant, [key]: key === "quantity" ? Number(value) || 0 : value }
              : variant,
        );
        return {
          ...item,
          payload: {
            ...item.payload,
            variants: nextVariants,
            quantity: nextVariants.reduce((total, v) => total + (Number(v.quantity) || 0), 0),
          },
        };
      }),
    );
  };

  const handleCreateProductSelect = (selected) => {
    preserveCurrentCreateItem();
    setCreateForm((p) => ({
      ...p,
      productId: String(
        receivedData.find((item) => String(item.Id) === String(selected?.value))
          ?.productId || "",
      ),
      receivedId: selected?.value || "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
    }));
  };

  useEffect(() => {
    if (
      !createForm?.receivedId ||
      !selectedCreateDamageStock ||
      isFetchingCreateProduct ||
      shouldShowCreateVariantOptions
    )
      return;

    const productId = String(createForm.productId || selectedCreateProductId || "");
    const stockId = String(createForm.receivedId);
    const selectedProduct = receivedDropdownOptions.find(
      (option) => option.value === stockId,
    );

    mergeCreateItem({
      payload: {
        receivedId: Number(createForm.receivedId),
        productId: Number(createForm.productId || selectedCreateProductId || 0),
        supplierId: Number(createForm.supplierId),
        warehouseId: Number(createForm.warehouseId),
        quantity: "",
        variants: [],
        note: createForm.note,
        remarks: createForm.remarks,
        date: createForm.date,
      },
      label:
        selectedProduct?.label ||
        selectedCreateDamageStock?.name ||
        `Product #${productId || stockId}`,
    });
    resetCreateProductFields();
  }, [
    createForm?.receivedId,
    createForm?.productId,
    selectedCreateDamageStock,
    selectedCreateProductId,
    isFetchingCreateProduct,
    shouldShowCreateVariantOptions,
    receivedDropdownOptions,
  ]);

  // create
  const handleCreate = async (e) => {
    e.preventDefault();

    let items = createItems.map((item) => applyCreateGlobalFields(item.payload));
    if (items.length === 0) {
      const item = buildCreatePayload();
      if (item.error) return toast.error(item.error);
      items = [applyCreateGlobalFields(item.payload)];
    }

    try {
      const payload = items.length === 1 ? items[0] : { items };
      const res = await insertDamageRepair(payload).unwrap();
      if (res?.success) {
        toast.success(
          items.length > 1 ? "Products created!" : "Successfully created!",
        );
        closeAdd();
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // update
  const handleUpdate = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");
    if (!currentItem?.receivedId && !currentItem?.productId)
      return toast.error("Please select a product");
    if (!currentItem.quantity || Number(currentItem.quantity) <= 0)
      return toast.error("Please enter valid quantity");

    const variantsPayload = getNormalizedVariantsPayload(
      currentItem?.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return toast.error("Duplicate size and color combination found");
    }
    if (
      editSizeOptions.length > 0 &&
      !validateVariantSelection(
        selectedEditDamageStock,
        variantsPayload,
        currentItem.quantity,
      )
    ) {
      return;
    }

    try {
      const payload = {
        note: currentItem.note,
        status: currentItem.status,
        supplierId: Number(currentItem.supplierId),
        warehouseId: Number(currentItem.warehouseId),
        remarks: currentItem.remarks,
        date: currentItem.date,
        quantity: Number(currentItem.quantity),
        variants: variantsPayload,
        receivedId: Number(currentItem.receivedId || currentItem.productId),
        productId: Number(currentItem.productId || selectedEditProductId || 0),
        userId: userId,
        actorRole: role,
      };

      const res = await updateDamageRepair({
        id: currentItem.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        closeEdit();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdate1 = async () => {
    if (!currentItem?.Id) return toast.error("Invalid item");

    try {
      const payload = {
        note: currentItem.note,
        status: currentItem.status,
        supplierId: Number(currentItem.supplierId),
        warehouseId: Number(currentItem.warehouseId),
        remarks: currentItem.remarks,
        quantity: Number(currentItem.quantity || 0),
        receivedId: Number(currentItem.receivedId || currentItem.productId),
        productId: Number(currentItem.productId || selectedEditProductId || 0),
        userId: userId,
        actorRole: role,
      };

      const res = await updateDamageRepair({
        id: currentItem.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");

        closeEdit1();
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // delete
  const handleDelete = async (id) => {
    if (
      !(await requestDeleteConfirmation({
        message: "Do you want to delete this item?",
      }))
    )
      return;

    try {
      const res = await deleteDamageRepair(id).unwrap();
      if (res?.success !== false) {
        toast.success("Deleted!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // clear filters
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
  };

  // pagination helpers
  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, Math.max(totalPages - pagesPerSet + 1, 1)),
    );

  // ✅ suppliers
  const {
    data: allSupplierRes,
    isLoading: isLoadingSupplier,
    isError: isErrorSupplier,
    error: errorSupplier,
  } = useGetAllSupplierWithoutQueryQuery();
  const suppliers = allSupplierRes?.data || [];

  useEffect(() => {
    if (isErrorSupplier)
      console.error("Error fetching suppliers", errorSupplier);
  }, [isErrorSupplier, errorSupplier]);

  // ✅ Dropdown options

  const supplierOptions = useMemo(
    () =>
      (suppliers || []).map((w) => ({
        value: w.Id,
        label: w.name,
      })),
    [suppliers],
  );

  // ✅ warehouses
  const {
    data: allWarehousesRes,
    isLoading: isLoadingWarehouse,
    isError: isErrorWarehouse,
    error: errorWarehouse,
  } = useGetAllWirehouseWithoutQueryQuery();
  const warehouses = allWarehousesRes?.data || [];

  useEffect(() => {
    if (isErrorWarehouse)
      console.error("Error fetching warehouses", errorWarehouse);
  }, [isErrorWarehouse, errorWarehouse]);

  const warehouseOptions = useMemo(
    () =>
      (warehouses || []).map((w) => ({
        value: w.Id,
        label: w.name,
      })),
    [warehouses],
  );

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add <Plus size={18} className="ml-2" />
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw size={18} className="text-amber-500" />
            <span className="text-sm">Total Damage Repair Product</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end w-full">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none
                       focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        {/* ✅ Per Page */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
          <Select
            options={[10, 20, 50, 100].map((v) => ({
              value: v,
              label: String(v),
            }))}
            value={{ value: itemsPerPage, label: String(itemsPerPage) }}
            onChange={(selected) => {
              setItemsPerPage(selected?.value || 10);
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="text-black"
            styles={selectStyles}
          />
        </div>

        {/* Product */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Product</label>
          <Select
            options={receivedDropdownOptions}
            value={
              receivedDropdownOptions.find((o) => o.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={receivedLoading ? "Loading..." : "Select Product"}
            isClearable
            isDisabled={receivedLoading}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Warehouse</label>
          <Select
            options={warehouseOptions}
            value={
              warehouseOptions.find(
                (o) => String(o.value) === String(warehouse),
              ) || null
            }
            onChange={(selected) => setWarehouse(selected?.value || "")}
            placeholder="Select Warehouse"
            isClearable
            className="text-black"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Supplier</label>
          <Select
            options={supplierOptions}
            value={
              supplierOptions.find(
                (o) => String(o.value) === String(supplier),
              ) || null
            }
            onChange={(selected) => setSupplier(selected?.value || "")}
            placeholder="Select Supplier"
            isClearable
            className="text-black"
          />
        </div>
        <button
          type="button"
          className="h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition rounded-xl px-4 text-sm font-semibold"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="four-row-table-scroll mt-6 rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Supplier
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Warehouse
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Variants
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Purchase Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Sale Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Remarks
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((rp) => {
              const variantDisplayRows = getVariantDisplayRows(rp);

              return (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {rp.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {rp.updatedAt
                      ? new Date(rp.updatedAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {resolveProductName(rp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp?.supplier?.name || "-"}
                  </td>{" "}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp?.warehouse?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.quantity || 0)}
                  </td>
                  <td className="px-6 py-4 min-w-[260px]">
                    {variantDisplayRows.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {variantDisplayRows.map((variant, index) => (
                          <div
                            key={`${rp.Id}-variant-${index}`}
                            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3 py-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                                {variant.size || "N/A"}
                              </span>
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-700">
                                {variant.color || "N/A"}
                              </span>
                            </div>
                            <div className="mt-2 text-[11px] font-medium text-slate-500">
                              Qty{" "}
                              <span className="font-bold text-slate-900">
                                {Number(variant.quantity || 0).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                        No variants
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.purchase_price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.sale_price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.remarks || ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.status || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                    {rp.note ? (
                      <div className="relative">
                        <button
                          className="relative h-10 w-10 rounded-md flex items-center justify-center"
                          title={rp.note}
                          type="button"
                          onClick={() => handleNoteClick(rp.note)} // Open modal on click
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>

                        <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                          {rp.note ? 1 : null}
                        </span>
                      </div>
                    ) : (
                      <button
                        className="h-10 w-10 rounded-md flex items-center justify-center"
                        title={rp.note}
                        type="button"
                      >
                        <Notebook size={18} className="text-slate-700" />
                      </button>
                    )}

                    <button
                      onClick={() => openEdit(rp)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Edit size={18} />
                    </button>

                    {role === "superAdmin" || role === "admin" ? (
                      <button
                        onClick={() => handleDelete(rp.Id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => openEdit1(rp)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-6 py-8 text-center text-sm text-slate-600"
                >
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Prev
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      {/* Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title="Note"
      >
        <p className="mt-4 text-sm text-slate-700">{noteContent}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleNoteModalClose}
            className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen && !!currentItem}
        onClose={closeEdit}
        title="Edit Product"
      >
        {currentItem ? (
          <>
            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">Name</label>
              <Select
                options={receivedDropdownOptions}
                value={
                  receivedDropdownOptions.find(
                    (o) => o.value === String(currentItem.receivedId),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem((p) => ({
                    ...p,
                    productId: String(
                      receivedData.find(
                        (item) => String(item.Id) === String(selected?.value),
                      )?.productId || "",
                    ),
                    receivedId: selected?.value || "",
                    variantRows: [createEmptyVariantRow()],
                    quantity: "",
                  }))
                }
                placeholder={receivedLoading ? "Loading..." : "Select Product"}
                isClearable
                isDisabled={receivedLoading}
                styles={selectStyles}
                className="text-black"
              />
            </div>
            {shouldShowEditVariantOptions && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Product Variants
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Add size, color and quantity combinations
                  </p>
                </div>
              </div>
              <div className="sticky top-0 z-20 -mx-4 flex justify-end bg-slate-50/95 px-4 py-2 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => addVariantRow("edit")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  disabled={!currentItem?.receivedId}
                >
                  <Plus size={14} />
                  Add Variant
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {normalizeVariantRows(currentItem?.variantRows).map(
                  (row, index) => {
                    const colorOptions = row.size
                      ? getVariationColorsForSize(
                          selectedEditProductData,
                          row.size,
                        )
                      : editColorOptions;

                    return (
                      <div
                        key={`edit-variant-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end"
                      >
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Size / Code
                          </label>
                          <Select
                            options={editSizeOptions}
                            value={
                              editSizeOptions.find(
                                (option) => option.value === row.size,
                              ) || null
                            }
                            onChange={(selected) =>
                              updateVariantRow(
                                "edit",
                                index,
                                "size",
                                selected?.value || "",
                              )
                            }
                            placeholder="Select size..."
                            isClearable
                            styles={selectStyles}
                            className="text-sm font-medium"
                            isDisabled={
                              !currentItem?.receivedId ||
                              editSizeOptions.length === 0
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Color
                          </label>
                          <Select
                            options={colorOptions}
                            value={
                              colorOptions.find(
                                (option) => option.value === row.color,
                              ) || null
                            }
                            onChange={(selected) =>
                              updateVariantRow(
                                "edit",
                                index,
                                "color",
                                selected?.value || "",
                              )
                            }
                            placeholder="Select color..."
                            isClearable
                            styles={selectStyles}
                            className="text-sm font-medium"
                            isDisabled={!row.size || colorOptions.length === 0}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.quantity}
                            onChange={(e) =>
                              updateVariantRow(
                                "edit",
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            disabled={
                              !currentItem?.receivedId ||
                              editSizeOptions.length === 0
                            }
                            className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder=""
                          />
                          {selectedEditDamageStock && row.size && (() => {
                            const match = getVariantDisplayRows(selectedEditDamageStock).find(
                              (v) => String(v.size || "") === String(row.size || "") && String(v.color || "") === String(row.color || ""),
                            );
                            return match !== undefined ? (
                              <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(match.quantity || 0)}</p>
                            ) : null;
                          })()}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeVariantRow("edit", index)}
                          className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                          disabled={
                            normalizeVariantRows(currentItem?.variantRows)
                              .length === 1
                          }
                        >
                          <span className="mx-auto block text-base leading-none">
                            x
                          </span>
                        </button>
                      </div>
                    );
                  },
                )}
              </div>
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm text-slate-700">Date</label>
              <input
                type="date"
                value={currentItem?.date || ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, date: e.target.value }))
                }
                className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Warehouse</label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentItem?.warehouseId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem({
                    ...currentItem,
                    warehouseId: selected?.value || "",
                  })
                }
                placeholder={
                  isLoadingWarehouse ? "Loading..." : "Select Warehouse"
                }
                isClearable
                className="text-black mt-1"
                styles={selectStyles}
                isDisabled={isLoadingWarehouse}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Supplier</label>
              <Select
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentItem?.supplierId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentItem({
                    ...currentItem,
                    supplierId: selected?.value || "",
                  })
                }
                placeholder={
                  isLoadingSupplier ? "Loading..." : "Select Supplier"
                }
                isClearable
                className="text-black mt-1"
                styles={selectStyles}
                isDisabled={isLoadingSupplier}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">
                Quantity
              </label>
              <input
                type="number"
                step="0.01"
                value={currentItem.quantity ?? ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, quantity: e.target.value }))
                }
                readOnly={hasConfiguredVariants(currentItem?.variantRows)}
                className={`h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none ${
                  hasConfiguredVariants(currentItem?.variantRows)
                    ? "bg-slate-50"
                    : "bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                }`}
              />
              {selectedEditDamageStock && !hasConfiguredVariants(currentItem?.variantRows) && (
                <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(selectedEditDamageStock.quantity || 0)}</p>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">
                Remarks
              </label>
              <input
                type="text"
                value={currentItem.remarks}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, remarks: e.target.value }))
                }
                className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
            {role === "superAdmin" || role === "admin" ? (
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Status
                </label>
                <Select
                  options={["Active", "Approved", "Pending"].map((status) => ({
                    value: status,
                    label: status,
                  }))}
                  value={
                    currentItem?.status
                      ? { value: currentItem.status, label: currentItem.status }
                      : null
                  }
                  onChange={(selected) =>
                    setCurrentItem((p) => ({
                      ...p,
                      status: selected?.value || "",
                    }))
                  }
                  placeholder="Select Status"
                  className="text-black"
                  styles={selectStyles}
                />
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Note
                </label>
                <textarea
                  value={currentItem?.note || ""}
                  onChange={(e) =>
                    setCurrentItem((p) => ({ ...p, note: e.target.value }))
                  }
                  className="min-h-[90px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-11 rounded-xl font-semibold"
                onClick={handleUpdate}
              >
                Save
              </button>
              <button
                className="bg-white hover:bg-slate-50 text-slate-800 px-4 h-11 rounded-xl border border-slate-200 font-semibold"
                onClick={closeEdit}
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        isOpen={isEditOpen1 && !!currentItem}
        onClose={closeEdit1}
        title="Edit Note"
      >
        {currentItem ? (
          <>
            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">Note</label>
              <textarea
                value={currentItem?.note || ""}
                onChange={(e) =>
                  setCurrentItem((p) => ({ ...p, note: e.target.value }))
                }
                className="min-h-[110px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-11 rounded-xl font-semibold"
                onClick={handleUpdate1}
              >
                Save
              </button>
              <button
                className="bg-white hover:bg-slate-50 text-slate-800 px-4 h-11 rounded-xl border border-slate-200 font-semibold"
                onClick={closeEdit1}
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      {/* Add Modal */}
      {/* {isAddOpen && (
        <div className="fixed top-42 inset-0 flex items-center justify-center   p-4">
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-xl w-full md:w-1/3 border border-slate-200"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Add Product
            </h2>

            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mt-4">
                  <label className="block text-sm text-slate-600 mb-1">
                    Name
                  </label>
                  <Select
                    options={receivedDropdownOptions}
                    value={
                      receivedDropdownOptions.find(
                        (o) => o.value === String(createForm.receivedId),
                      ) || null
                    }
                    onChange={(selected) =>
                      setCreateForm((p) => ({
                        ...p,
                        productId: String(
                          receivedData.find(
                            (item) =>
                              String(item.Id) === String(selected?.value),
                          )?.productId || "",
                        ),
                        receivedId: selected?.value || "",
                        variantRows: [createEmptyVariantRow()],
                        quantity: "",
                      }))
                    }
                    placeholder={
                      receivedLoading ? "Loading..." : "Select Product"
                    }
                    isClearable
                    isDisabled={receivedLoading}
                    styles={selectStyles}
                    className="text-black"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-slate-700">Date</label>
                  <input
                    type="date"
                    value={createForm?.date || ""}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, date: e.target.value }))
                    }
                    className="border bg-white border-slate-200 rounded-xl p-2 w-full mt-1 text-slate-900 outline-none
                           focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  />
                </div>
              </div>

              {shouldShowCreateVariantOptions && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Product Variants
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Add size, color and quantity combinations
                    </p>
                  </div>
                </div>
                <div className="sticky top-0 z-20 -mx-4 flex justify-end bg-slate-50/95 px-4 py-2 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => addVariantRow("create")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    disabled={!createForm?.receivedId}
                  >
                    <Plus size={14} />
                    Add Variant
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {normalizeVariantRows(createForm?.variantRows).map(
                    (row, index) => {
                      const colorOptions = row.size
                        ? getVariationColorsForSize(
                            selectedCreateProductData,
                            row.size,
                          )
                        : createColorOptions;

                      return (
                        <div
                          key={`create-variant-${index}`}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end"
                        >
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                              Size
                            </label>
                            <Select
                              options={createSizeOptions}
                              value={
                                createSizeOptions.find(
                                  (option) => option.value === row.size,
                                ) || null
                              }
                              onChange={(selected) =>
                                updateVariantRow(
                                  "create",
                                  index,
                                  "size",
                                  selected?.value || "",
                                )
                              }
                              placeholder="Select size..."
                              isClearable
                              styles={selectStyles}
                              className="text-sm font-medium"
                              isDisabled={
                                !createForm?.receivedId ||
                                createSizeOptions.length === 0
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                              Color
                            </label>
                            <Select
                              options={colorOptions}
                              value={
                                colorOptions.find(
                                  (option) => option.value === row.color,
                                ) || null
                              }
                              onChange={(selected) =>
                                updateVariantRow(
                                  "create",
                                  index,
                                  "color",
                                  selected?.value || "",
                                )
                              }
                              placeholder="Select color..."
                              isClearable
                              styles={selectStyles}
                              className="text-sm font-medium"
                              isDisabled={
                                !row.size || colorOptions.length === 0
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.quantity}
                              onChange={(e) =>
                                updateVariantRow(
                                  "create",
                                  index,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              disabled={
                                !createForm?.receivedId ||
                                createSizeOptions.length === 0
                              }
                              className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                              placeholder=""
                            />
                            {selectedCreateDamageStock && row.size && (() => {
                              const match = getVariantDisplayRows(selectedCreateDamageStock).find(
                                (v) => String(v.size || "") === String(row.size || "") && String(v.color || "") === String(row.color || ""),
                              );
                              return match !== undefined ? (
                                <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(match.quantity || 0)}</p>
                              ) : null;
                            })()}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeVariantRow("create", index)}
                            className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                            disabled={
                              normalizeVariantRows(createForm?.variantRows)
                                .length === 1
                            }
                          >
                            <span className="mx-auto block text-base leading-none">
                              x
                            </span>
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm text-slate-700">
                  Warehouse
                </label>
                <Select
                  options={warehouseOptions}
                  value={
                    warehouseOptions.find(
                      (option) =>
                        String(option.value) ===
                        String(createForm?.warehouseId || ""),
                    ) || null
                  }
                  onChange={(selected) =>
                    setCreateForm({
                      ...createForm,
                      warehouseId: selected?.value || "",
                    })
                  }
                  placeholder={
                    isLoadingWarehouse ? "Loading..." : "Select Warehouse"
                  }
                  isClearable
                  className="text-black mt-1"
                  styles={selectStyles}
                  isDisabled={isLoadingWarehouse}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-700">Supplier</label>
                <Select
                  options={supplierOptions}
                  value={
                    supplierOptions.find(
                      (option) =>
                        String(option.value) ===
                        String(createForm?.supplierId || ""),
                    ) || null
                  }
                  onChange={(selected) =>
                    setCreateForm({
                      ...createForm,
                      supplierId: selected?.value || "",
                    })
                  }
                  placeholder={
                    isLoadingSupplier ? "Loading..." : "Select Supplier"
                  }
                  isClearable
                  className="text-black mt-1"
                  styles={selectStyles}
                  isDisabled={isLoadingSupplier}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.quantity}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, quantity: e.target.value }))
                  }
                  readOnly={hasConfiguredVariants(createForm?.variantRows)}
                  className={`h-11 border border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none ${
                    hasConfiguredVariants(createForm?.variantRows)
                      ? "bg-slate-50"
                      : "bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  }`}
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-600 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={createForm.remarks}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-700">Note</label>
                <textarea
                  value={createForm?.note || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      note: e.target.value,
                    })
                  }
                  className="min-h-[90px] border border-slate-200 rounded-xl p-3 w-full mt-1 text-slate-900 bg-white outline-none
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-11 rounded-xl font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="bg-white hover:bg-slate-50 text-slate-800 px-4 h-11 rounded-xl border border-slate-200 font-semibold"
                  onClick={closeAdd}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )} */}

      <Modal
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Add Damage Repairing Product"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          {/* Product selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Select Product
            </label>
            <Select
              options={receivedDropdownOptions}
              value={
                receivedDropdownOptions.find(
                  (o) => o.value === String(createForm.receivedId),
                ) || null
              }
              onChange={handleCreateProductSelect}
              placeholder={receivedLoading ? "Loading..." : "Select Product"}
              isClearable
              isDisabled={receivedLoading}
              styles={selectStyles}
              className="text-black"
            />
          </div>

          {/* Product Line Items - always visible */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Product Line Items</p>
                <p className="text-[11px] text-slate-400">Select products above, then set quantity here</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Quantity</p>
                <p className="text-lg font-black text-slate-900">{createItemsTotalQuantity || ""}</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-[600px] w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left">Product</th>
                    <th className="px-3 py-3 text-left">Quantity</th>
                    <th className="px-3 py-3 text-left">Variant Detail</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {createItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">No products added</td>
                    </tr>
                  ) : (
                    createItems.map((item, index) => (
                      <tr key={`${item.label}-${index}`}>
                        <td className="px-3 py-3 align-top font-semibold text-slate-800">{item.label}</td>
                        <td className="px-3 py-3 align-top">
                          {item.payload.variants?.length ? (
                            <p className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                              {Number(item.payload.quantity) || ""}
                            </p>
                          ) : (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={
                                  Number(item.payload.quantity) === 0
                                    ? ""
                                    : item.payload.quantity
                                }
                                onChange={(e) => updateCreateItem(index, "quantity", e.target.value)}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                              />
                              {(() => {
                                const invItem = receivedData.find((r) => Number(r.Id) === Number(item.payload?.receivedId || item.payload?.productId));
                                return invItem ? (
                                  <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(invItem.quantity || 0)}</p>
                                ) : null;
                              })()}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500">
                          {item.payload.variants?.length ? (
                            item.payload.variants.map((variant, variantIndex) => (
                              <div key={`${variant.size}-${variant.color}-${variantIndex}`} className="mb-2 grid grid-cols-[1fr_90px] items-end gap-2 last:mb-0">
                                <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                  {variant.size || "-"} / {variant.color || "-"}
                                </span>
                                <div>
                                  {variantIndex === 0 && <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Qty</p>}
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variant.quantity}
                                    onChange={(e) => updateCreateItemVariantField(index, variantIndex, "quantity", e.target.value)}
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                  />
                                  {(() => {
                                    const invItem = receivedData.find((r) => Number(r.Id) === Number(item.payload?.receivedId || item.payload?.productId));
                                    if (!invItem) return null;
                                    const match = getVariantDisplayRows(invItem).find(
                                      (v) => String(v.size || "") === String(variant.size || "") && String(v.color || "") === String(variant.color || ""),
                                    );
                                    return match !== undefined ? (
                                      <p className="mt-0.5 text-[10px] text-slate-400">Stock: {Number(match.quantity || 0)}</p>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            ))
                          ) : "No variants"}
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setCreateItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                            className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Variants section - conditional */}
          {shouldShowCreateVariantOptions && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Variants</p>
                <p className="text-[11px] text-slate-400">Add size, color and quantity combinations</p>
              </div>
              <div className="sticky top-0 z-20 -mx-4 flex justify-end bg-slate-50/95 px-4 py-2 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => addVariantRow("create")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  disabled={!createForm?.receivedId}
                >
                  <Plus size={14} />
                  Add Variant
                </button>
              </div>
              {normalizeVariantRows(createForm?.variantRows).map((row, index) => {
                const colorOptions = row.size
                  ? getVariationColorsForSize(selectedCreateProductData, row.size)
                  : createColorOptions;
                return (
                  <div key={`create-variant-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end rounded-2xl border border-slate-200 bg-white p-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Size / Code</label>
                      <Select
                        options={createSizeOptions}
                        value={createSizeOptions.find((option) => option.value === row.size) || null}
                        onChange={(selected) => updateVariantRow("create", index, "size", selected?.value || "")}
                        placeholder="Select size..."
                        isClearable
                        styles={selectStyles}
                        className="text-sm font-medium"
                        isDisabled={!createForm?.receivedId || createSizeOptions.length === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Color</label>
                      <Select
                        options={colorOptions}
                        value={colorOptions.find((option) => option.value === row.color) || null}
                        onChange={(selected) => updateVariantRow("create", index, "color", selected?.value || "")}
                        placeholder="Select color..."
                        isClearable
                        styles={selectStyles}
                        className="text-sm font-medium"
                        isDisabled={!row.size || colorOptions.length === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.quantity}
                        onChange={(e) => updateVariantRow("create", index, "quantity", e.target.value)}
                        disabled={!createForm?.receivedId || createSizeOptions.length === 0}
                        className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder=""
                      />
                      {selectedCreateDamageStock && row.size && (() => {
                        const match = getVariantDisplayRows(selectedCreateDamageStock).find(
                          (v) => String(v.size || "") === String(row.size || "") && String(v.color || "") === String(row.color || ""),
                        );
                        return match !== undefined ? (
                          <p className="mt-1 text-[10px] text-slate-400">Stock: {Number(match.quantity || 0)}</p>
                        ) : null;
                      })()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariantRow("create", index)}
                      className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                      disabled={normalizeVariantRows(createForm?.variantRows).length === 1}
                    >
                      <X size={16} className="mx-auto" />
                    </button>
                  </div>
                );
              })}
              <div className="flex justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={handleAddCreateItem}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
                >
                  <Plus size={16} />
                  Add Variants
                </button>
              </div>
            </div>
          )}

          {/* Date + Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Date</label>
              <input
                type="date"
                value={createForm?.date || ""}
                onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
                className="h-11 px-3 border border-slate-200 rounded-xl w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Warehouse</label>
              <Select
                options={warehouseOptions}
                value={warehouseOptions.find((option) => String(option.value) === String(createForm?.warehouseId || "")) || null}
                onChange={(selected) => setCreateForm({ ...createForm, warehouseId: selected?.value || "" })}
                placeholder={isLoadingWarehouse ? "Loading..." : "Select Warehouse"}
                isClearable
                styles={selectStyles}
                className="text-black"
                isDisabled={isLoadingWarehouse}
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Supplier</label>
            <Select
              options={supplierOptions}
              value={supplierOptions.find((option) => String(option.value) === String(createForm?.supplierId || "")) || null}
              onChange={(selected) => setCreateForm({ ...createForm, supplierId: selected?.value || "" })}
              placeholder={isLoadingSupplier ? "Loading..." : "Select Supplier"}
              isClearable
              styles={selectStyles}
              className="text-black"
              isDisabled={isLoadingSupplier}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Remarks</label>
            <input
              type="text"
              value={createForm.remarks}
              onChange={(e) => setCreateForm((p) => ({ ...p, remarks: e.target.value }))}
              className="h-11 border bg-white border-slate-200 rounded-xl px-3 w-full text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Note</label>
            <textarea
              value={createForm?.note || ""}
              onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
              className="min-h-[80px] border border-slate-200 rounded-xl p-3 w-full text-slate-900 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
              placeholder="Enter additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={closeAdd}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              {createItems.length > 0 ? "Save Products" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default DamageRepairTable;
