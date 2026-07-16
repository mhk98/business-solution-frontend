import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Notebook,
  Plus,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";

import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import {
  useDeleteMixerMutation,
  useGetAllMixerQuery,
  useInsertMixerMutation,
  useUpdateMixerMutation,
} from "../../features/mixer/mixer";
import {
  useGetAllProductWithoutQueryQuery,
  useGetSingleReceivedProductByIdQuery,
} from "../../features/product/product";
import { useGetAllManufacturerWithoutQueryQuery } from "../../features/manufacturer/manufacturer";
import { useGetAllItemMasterWithoutQueryQuery } from "../../features/manufactureStock/manufactureStock";
import { useGetAllManufactureStockQuery } from "../../features/manufactureStockBalance/manufactureStockBalance";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
// import { useGetSingleManDataByIdMutation } from "../../features/manufacture/manufacture";

const createEmptyMaterialSelection = () => ({
  manufactureId: "",
  value: "",
  quantity: "",
  unit: "Pcs",
});

const createEmptyPackagingSelection = () => ({
  itemMasterId: "",
  value: "",
  quantity: "",
  unit: "Pcs",
});

const initialCreateProduct = {
  productId: "",
  manufacturerId: "",
  warehouseId: "",
  combo: "",
  unitWage: "",
  purchase_price: "",
  sale_price: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
  materialSelections: [createEmptyMaterialSelection()],
  packagingSelections: [createEmptyPackagingSelection()],
  variantRows: [{ size: "", color: "", quantity: "" }],
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
  ].map((value) => ({ value, label: value }));
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

const getVariantRowsFromProduct = (product) => {
  if (!Array.isArray(product?.variations) || product.variations.length === 0) {
    return [];
  }

  return product.variations.flatMap((variation) => {
    const sizes = parseVariationValue(variation?.size);
    const colors = parseVariationValue(variation?.color);
    return sizes.flatMap((size) =>
      colors.length ? colors.map((color) => ({ size, color })) : [{ size }],
    );
  });
};

const createEmptyVariantRow = () => ({
  size: "",
  color: "",
  quantity: "",
  purchase_price: "",
  sale_price: "",
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
      purchase_price:
        row?.purchase_price !== undefined && row?.purchase_price !== null
          ? String(row.purchase_price)
          : "",
      sale_price:
        row?.sale_price !== undefined && row?.sale_price !== null
          ? String(row.sale_price)
          : "",
    }));
  }

  return [createEmptyVariantRow()];
};

const getNormalizedVariantsPayload = (rows) =>
  normalizeVariantRows(rows)
    .filter((row) => row.size || row.color || row.quantity)
    .map((row) => ({
      size: row.size || "",
      color: row.color || "",
      quantity: Number(row.quantity) || 0,
      purchase_price: Number(row.purchase_price) || 0,
      sale_price: Number(row.sale_price) || 0,
    }))
    .filter((row) => row.size);

const getVariantQuantityTotal = (rows) =>
  getNormalizedVariantsPayload(rows).reduce(
    (total, row) => total + (Number(row.quantity) || 0),
    0,
  );

const buildMixerVariantNote = (rows) => {
  const variants = getNormalizedVariantsPayload(rows);
  if (!variants.length) return "";

  return variants
    .map((variant, index) => {
      const label = [variant.size, variant.color].filter(Boolean).join(" / ");
      return `Variant ${index + 1}: ${label}${variant.quantity ? ` x ${variant.quantity}` : ""}`;
    })
    .join("\n");
};

const idsMatch = (left, right) =>
  String(left ?? "") !== "" && String(left ?? "") === String(right ?? "");

const normalizeKey = (value) => String(value ?? "").trim();

const findItemMasterForFactoryStock = (stockItem, itemMasterRows = []) => {
  const stockItemId = stockItem?.itemId ?? stockItem?.item_id;
  const stockProductId = stockItem?.productId ?? stockItem?.product_id;
  const stockVariantKey = normalizeKey(stockItem?.variantKey);
  const stockName = normalizeKey(stockItem?.name).toLowerCase();

  return (
    itemMasterRows.find((item) => {
      const sameItem = idsMatch(item?.itemId ?? item?.item_id, stockItemId);
      const sameProduct =
        !stockProductId ||
        idsMatch(item?.productId ?? item?.product_id, stockProductId);
      const sameVariant =
        normalizeKey(item?.variantKey) === stockVariantKey ||
        (!normalizeKey(item?.variantKey) && !stockVariantKey);

      return sameItem && sameProduct && sameVariant;
    }) ||
    itemMasterRows.find(
      (item) => normalizeKey(item?.name).toLowerCase() === stockName,
    )
  );
};

const normalizeManufactureItems = (response, itemMasterRows = []) => {
  const baseData =
    response?.data?.items ??
    response?.items ??
    response?.data ??
    response ??
    [];

  const list = Array.isArray(baseData) ? baseData : baseData ? [baseData] : [];

  return list.map((item, index) => {
    const matchedItemMaster = findItemMasterForFactoryStock(
      item,
      itemMasterRows,
    );
    const baseLabel =
      item?.name ||
      item?.itemName ||
      item?.item?.name ||
      item?.product?.name ||
      `Manufacture Item ${index + 1}`;
    return {
      id: String(
        matchedItemMaster?.Id ??
          matchedItemMaster?.id ??
          item?.itemMasterId ??
          item?.itemMaster?.Id ??
          item?.itemMaster?.id ??
          item?.Id ??
          item?.id ??
          item?.manufactureId ??
          item?.manufactureItemId ??
          item?.itemId ??
          index,
      ),
      label: baseLabel,
      unitValue:
        item?.unitValue ??
        item?.quantity ??
        item?.item?.unitValue ??
        item?.product?.unitValue ??
        "",
      unit: item?.unit ?? item?.item?.unit ?? item?.product?.unit ?? "Pcs",
    };
  });
};

const formatManufactureItemUnit = (item) => {
  const value = Number(item?.unitValue);

  if (!item || Number.isNaN(value) || value <= 0) {
    return item?.unit || "Pcs";
  }

  return `${value} ${item?.unit || "Pcs"}`;
};

const getManufactureItemUnitLabel = (item) => item?.unit || "Pcs";

const getMaterialTotal = (selection) =>
  Number(selection?.value || 0) * Number(selection?.quantity || 0);

const getPackagingTotal = (selection) =>
  Number(selection?.value || 0) * Number(selection?.quantity || 0);

const normalizeMaterialSelections = (existingSelections = []) => {
  if (Array.isArray(existingSelections) && existingSelections.length > 0) {
    return existingSelections.map((selection) => ({
      manufactureId: selection?.manufactureId
        ? String(selection.manufactureId)
        : "",
      value:
        selection?.value !== undefined && selection?.value !== null
          ? String(selection.value)
          : selection?.unitValue !== undefined && selection?.unitValue !== null
            ? String(selection.unitValue)
            : selection?.quantity !== undefined && selection?.quantity !== null
              ? String(selection.quantity)
              : "",
      quantity:
        selection?.quantity !== undefined &&
        selection?.quantity !== null &&
        selection?.value !== undefined
          ? String(selection.quantity)
          : selection?.multiplier !== undefined && selection?.multiplier !== null
            ? String(selection.multiplier)
            : selection?.count !== undefined && selection?.count !== null
              ? String(selection.count)
              : selection?.value !== undefined
                ? ""
                : "1",
      unit: selection?.unit || "Pcs",
    }));
  }

  return [createEmptyMaterialSelection()];
};

const getSelectedMaterialItems = (selections) =>
  normalizeMaterialSelections(selections).filter(
    (selection) =>
      selection.manufactureId || selection.value || selection.quantity,
  );

const validateMaterialSelections = (selections) => {
  const selectedItems = getSelectedMaterialItems(selections);
  const selectedIds = selectedItems
    .map((selection) => selection.manufactureId)
    .filter(Boolean);

  if (new Set(selectedIds).size !== selectedIds.length) {
    return "Please remove duplicate manufacture items";
  }

  const invalidIndex = selectedItems.findIndex(
    (selection) =>
      !selection.manufactureId ||
      Number(selection.value || 0) <= 0 ||
      Number(selection.quantity || 0) <= 0,
  );

  if (invalidIndex !== -1) {
    return `Please select manufacture item, value and quantity for row ${invalidIndex + 1}`;
  }

  return "";
};

const buildMaterialPayload = (selections, manufactureItems = []) => {
  const unitMap = new Map(
    (manufactureItems || []).map((item) => [String(item.id), item.unit || "Pcs"]),
  );

  return getSelectedMaterialItems(selections).map((selection) => ({
    manufactureId: Number(selection.manufactureId) || "",
    unitValue: getMaterialTotal(selection),
    value: Number(selection.value) || 0,
    quantity: Number(selection.quantity) || 0,
    unit: unitMap.get(String(selection.manufactureId)) || selection.unit || "Pcs",
  }));
};

const normalizePackagingSelections = (existingSelections = []) => {
  if (Array.isArray(existingSelections) && existingSelections.length > 0) {
    return existingSelections.map((selection) => ({
      itemMasterId:
        selection?.itemMasterId !== undefined && selection?.itemMasterId !== null
          ? String(selection.itemMasterId)
          : "",
      value:
        selection?.value !== undefined && selection?.value !== null
          ? String(selection.value)
          : selection?.unitValue !== undefined && selection?.unitValue !== null
            ? String(selection.unitValue)
            : selection?.quantity !== undefined && selection?.quantity !== null
              ? String(selection.quantity)
              : "",
      quantity:
        selection?.quantity !== undefined &&
        selection?.quantity !== null &&
        selection?.value !== undefined
          ? String(selection.quantity)
          : selection?.multiplier !== undefined && selection?.multiplier !== null
            ? String(selection.multiplier)
            : selection?.count !== undefined && selection?.count !== null
              ? String(selection.count)
              : selection?.value !== undefined
                ? ""
                : "1",
      unit: selection?.unit || "Pcs",
    }));
  }

  return [createEmptyPackagingSelection()];
};

const buildMixerMaterialNote = (
  manufactureItems,
  selections,
  extraNote = "",
) => {
  const optionMap = new Map(
    manufactureItems.map((item) => [item.id, item.label]),
  );
  const detailLines = selections
    .map((selection, index) => {
      if (!selection?.manufactureId || getMaterialTotal(selection) <= 0) {
        return "";
      }
      const label =
        optionMap.get(String(selection.manufactureId)) ||
        `Manufacture Item ${index + 1}`;
      return `${label}: ${selection.value} x ${selection.quantity} = ${getMaterialTotal(selection)}`;
    })
    .filter(Boolean);

  return [...detailLines, extraNote || ""].filter(Boolean).join("\n");
};

const getSelectedPackagingItems = (selections) =>
  normalizePackagingSelections(selections).filter(
    (selection) => selection.itemMasterId || selection.value || selection.quantity,
  );

const validatePackagingSelections = (selections) => {
  const selectedItems = getSelectedPackagingItems(selections);
  const selectedIds = selectedItems
    .map((selection) => selection.itemMasterId)
    .filter(Boolean);

  if (new Set(selectedIds).size !== selectedIds.length) {
    return "Please remove duplicate packaging items";
  }

  const invalidIndex = selectedItems.findIndex(
    (selection) =>
      !selection.itemMasterId ||
      Number(selection.value || 0) <= 0 ||
      Number(selection.quantity) <= 0,
  );

  if (invalidIndex !== -1) {
    return `Please select packaging item, value and quantity for row ${invalidIndex + 1}`;
  }

  return "";
};

const buildPackagingPayload = (selections) =>
  getSelectedPackagingItems(selections).map((selection) => ({
    itemMasterId: Number(selection.itemMasterId) || "",
    unitValue: getPackagingTotal(selection),
    value: Number(selection.value) || 0,
    quantity: Number(selection.quantity) || 0,
    unit: selection.unit || "Pcs",
  }));

const MixerTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);

  const [currentProduct, setCurrentProduct] = useState(null);
  const [createProduct, setCreateProduct] = useState(initialCreateProduct);

  const [rows, setRows] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [itemName, setItemName] = useState("");

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };

    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [startDate, endDate, itemName, itemsPerPage]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);

    if (pageNumber < startPage) {
      setStartPage(pageNumber);
    } else if (pageNumber > endPage) {
      setStartPage(pageNumber - pagesPerSet + 1);
    }
  };

  const handlePreviousSet = () => {
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));
  };

  const handleNextSet = () => {
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );
  };

  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllProductWithoutQueryQuery();
  const { data: manufacturersRes, isLoading: isLoadingManufacturers } =
    useGetAllManufacturerWithoutQueryQuery();
  const { data: warehousesRes, isLoading: isLoadingWarehouses } =
    useGetAllWirehouseWithoutQueryQuery();
  const { data: itemMasterRes, isLoading: isLoadingItemMaster } =
    useGetAllItemMasterWithoutQueryQuery();
  const createManufacturerId = createProduct?.manufacturerId || undefined;
  const currentManufacturerId = currentProduct?.manufacturerId || undefined;
  const {
    data: createManufactureStockRes,
    isLoading: isLoadingCreateManufactureStock,
  } = useGetAllManufactureStockQuery(
    {
      page: 1,
      limit: 100000,
      manufacturerId: createManufacturerId,
    },
    { skip: !createManufacturerId },
  );
  const {
    data: currentManufactureStockRes,
    isLoading: isLoadingCurrentManufactureStock,
  } = useGetAllManufactureStockQuery(
    {
      page: 1,
      limit: 100000,
      manufacturerId: currentManufacturerId,
    },
    { skip: !currentManufacturerId },
  );

  const productsData = useMemo(
    () => allProductsRes?.data || [],
    [allProductsRes?.data],
  );
  const manufacturersData = useMemo(
    () => manufacturersRes?.data || [],
    [manufacturersRes?.data],
  );
  const warehousesData = useMemo(
    () => warehousesRes?.data || [],
    [warehousesRes?.data],
  );
  const itemMasterData = useMemo(
    () => itemMasterRes?.data || [],
    [itemMasterRes?.data],
  );

  useEffect(() => {
    if (isErrorAllProducts) {
      console.error("Error fetching products", errorAllProducts);
    }
  }, [isErrorAllProducts, errorAllProducts]);

  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: String(p.Id ?? p.id ?? p._id),
      label: p.name,
    }));
  }, [productsData]);

  const manufacturerDropdownOptions = useMemo(() => {
    return (manufacturersData || []).map((manufacturer) => ({
      value: String(manufacturer.Id ?? manufacturer.id ?? manufacturer._id),
      label: manufacturer.name,
    }));
  }, [manufacturersData]);

  const warehouseDropdownOptions = useMemo(() => {
    return (warehousesData || []).map((warehouse) => ({
      value: String(warehouse.Id ?? warehouse.id ?? warehouse._id),
      label: warehouse.name,
    }));
  }, [warehousesData]);

  const packagingItemOptions = useMemo(() => {
    return (itemMasterData || []).map((item) => ({
      value: String(item.Id ?? item.id ?? item._id),
      label: [
        item.name,
        `${Number(item.unitValue || 0)} ${item.unit || "Pcs"}`,
      ]
        .filter(Boolean)
        .join(" - "),
      unit: item.unit || "Pcs",
    }));
  }, [itemMasterData]);

  const selectedCreateProductId = createProduct?.productId || undefined;
  const selectedEditProductId = currentProduct?.productId || undefined;

  const { data: selectedCreateProductRes } =
    useGetSingleReceivedProductByIdQuery(selectedCreateProductId, {
      skip: !selectedCreateProductId,
    });
  const { data: selectedEditProductRes } = useGetSingleReceivedProductByIdQuery(
    selectedEditProductId,
    { skip: !selectedEditProductId },
  );

  const selectedCreateProductData =
    selectedCreateProductRes?.data || selectedCreateProductRes;
  const selectedEditProductData =
    selectedEditProductRes?.data || selectedEditProductRes;

  const selectedCreateProductVariants = useMemo(
    () => getVariantRowsFromProduct(selectedCreateProductData),
    [selectedCreateProductData],
  );
  const selectedEditProductVariants = useMemo(
    () => getVariantRowsFromProduct(selectedEditProductData),
    [selectedEditProductData],
  );

  const shouldShowCreateVariantOptions =
    Boolean(createProduct?.productId) &&
    selectedCreateProductVariants.length > 0;
  const shouldShowEditVariantOptions =
    Boolean(currentProduct?.productId) &&
    selectedEditProductVariants.length > 0;

  const createSizeOptions = useMemo(
    () => getVariationOptions(selectedCreateProductData, "size"),
    [selectedCreateProductData],
  );
  const createColorOptions = useMemo(
    () => getVariationOptions(selectedCreateProductData, "color"),
    [selectedCreateProductData],
  );
  const editSizeOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "size"),
    [selectedEditProductData],
  );
  const editColorOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "color"),
    [selectedEditProductData],
  );

  const createVariantQuantityTotal = useMemo(
    () => getVariantQuantityTotal(createProduct?.variantRows),
    [createProduct?.variantRows],
  );
  const editVariantQuantityTotal = useMemo(
    () => getVariantQuantityTotal(currentProduct?.variantRows),
    [currentProduct?.variantRows],
  );

  useEffect(() => {
    if (!shouldShowCreateVariantOptions) return;
    setCreateProduct((prev) => ({
      ...prev,
      combo: createVariantQuantityTotal ? String(createVariantQuantityTotal) : "",
    }));
  }, [createVariantQuantityTotal, shouldShowCreateVariantOptions]);

  useEffect(() => {
    if (!shouldShowEditVariantOptions) return;
    setCurrentProduct((prev) =>
      prev
        ? {
            ...prev,
            combo: editVariantQuantityTotal
              ? String(editVariantQuantityTotal)
              : "",
          }
        : prev,
    );
  }, [editVariantQuantityTotal, shouldShowEditVariantOptions]);

  const updateVariantRow = (mode, index, key, value) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;

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
      };
    });
  };

  const addVariantRow = (mode) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
    }));
  };

  const removeVariantRow = (mode, index) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).filter(
        (_, rowIndex) => rowIndex !== index,
      );

      return {
        ...prev,
        variantRows: nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
      };
    });
  };

  const itemNameMap = useMemo(() => {
    const m = new Map();
    (productsData || []).forEach((p) => {
      const key = String(p.Id ?? p.id ?? p._id);
      m.set(key, p.name);
    });
    return m;
  }, [productsData]);

  const itemMasterNameMap = useMemo(() => {
    const m = new Map();
    (itemMasterData || []).forEach((item) => {
      const key = String(item.Id ?? item.id ?? item._id);
      m.set(key, item.name || `Item #${key}`);
    });
    return m;
  }, [itemMasterData]);

  const summarizeSelections = (items = [], idKey, nameMap, fallbackLabel) => {
    if (!Array.isArray(items) || items.length === 0) return "-";
    const selectedItems = items.filter((item) => Number(item?.unitValue || 0) > 0);
    if (!selectedItems.length) return "-";

    const [first, ...rest] = selectedItems;
    const id = first?.[idKey];
    const name = nameMap.get(String(id)) || `${fallbackLabel} #${id || 1}`;
    const total = Number(first?.unitValue || 0).toLocaleString();
    const suffix = rest.length ? ` +${rest.length}` : "";
    return `${name} (${total})${suffix}`;
  };

  const createManufactureItems = useMemo(
    () => normalizeManufactureItems(createManufactureStockRes, itemMasterData),
    [createManufactureStockRes, itemMasterData],
  );

  const currentManufactureItems = useMemo(
    () => normalizeManufactureItems(currentManufactureStockRes, itemMasterData),
    [currentManufactureStockRes, itemMasterData],
  );

  const createManufactureOptions = useMemo(
    () =>
      createManufactureItems.map((item) => ({
        value: item.id,
        label: `${item.label} (${formatManufactureItemUnit(item)})`,
      })),
    [createManufactureItems],
  );

  const currentManufactureOptions = useMemo(
    () =>
      currentManufactureItems.map((item) => ({
        value: item.id,
        label: `${item.label} (${formatManufactureItemUnit(item)})`,
      })),
    [currentManufactureItems],
  );

  const resolveItemName = (rp) => {
    const possibleName =
      rp?.itemName ||
      rp?.name ||
      rp?.item?.name ||
      rp?.Item?.name ||
      rp?.product?.name ||
      rp?.Product?.name ||
      "";

    if (possibleName) return possibleName;

    const possibleId =
      rp?.itemId ??
      rp?.item_id ??
      rp?.ItemId ??
      rp?.productId ??
      rp?.product_id ??
      rp?.ProductId ??
      rp?.manufactureItemId ??
      rp?.item?.Id ??
      rp?.item?.id ??
      rp?.item?._id ??
      rp?.Item?.Id ??
      rp?.Item?.id ??
      rp?.product?.Id ??
      rp?.product?.id ??
      rp?.product?._id ??
      "";

    if (possibleId === "" || possibleId === null || possibleId === undefined) {
      return "N/A";
    }

    const matchedName = itemNameMap.get(String(possibleId));
    return matchedName || `Item #${possibleId}`;
  };

  useEffect(() => {
    if (!isModalOpen1) return;
    setCreateProduct((prev) => ({
      ...prev,
      materialSelections: normalizeMaterialSelections(prev.materialSelections),
    }));
  }, [createManufactureItems, isModalOpen1]);

  useEffect(() => {
    if (!isModalOpen) return;
    setCurrentProduct((prev) =>
      prev
        ? {
            ...prev,
            materialSelections: normalizeMaterialSelections(
              prev.materialSelections,
            ),
          }
        : prev,
    );
  }, [currentManufactureItems, isModalOpen]);

  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: itemName || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "") {
        delete args[k];
      }
    });

    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, itemName]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllMixerQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching received product data", error);
      return;
    }

    if (!isLoading && data) {
      setRows(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  const [insertMixer] = useInsertMixerMutation();
  const [updateMixer] = useUpdateMixerMutation();
  const [deleteMixer] = useDeleteMixerMutation();

  const handleAddProduct = () => setIsModalOpen1(true);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
  };

  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setCreateProduct(initialCreateProduct);
  };

  const handleModalClose2 = () => {
    setIsModalOpen2(false);
    setCurrentProduct(null);
  };

  const handleEditClick = (rp) => {
    setCurrentProduct({
      ...rp,
      productId:
        rp.productId || rp.product_id || rp.ProductId
          ? String(rp.productId || rp.product_id || rp.ProductId)
          : "",
      manufacturerId:
        rp.manufacturerId || rp.manufacturer_id || rp.ManufacturerId
          ? String(rp.manufacturerId || rp.manufacturer_id || rp.ManufacturerId)
          : "",
      warehouseId:
        rp.warehouseId || rp.warehouse_id || rp.WarehouseId
          ? String(rp.warehouseId || rp.warehouse_id || rp.WarehouseId)
          : "",
      combo: rp.combo ?? "",
      unitWage: rp.unitWage ?? "",
      purchase_price: rp.purchase_price ?? "",
      sale_price: rp.sale_price ?? "",
      date: rp.date ?? "",
      note: rp.note ?? "",
      // cost: rp.cost ?? "",
      // unitValue: rp.unitValue ?? "",
      // unit: rp.unit ?? "Pcs",
      // hasUnit: !!rp.unitValue,
      materialSelections: normalizeMaterialSelections(rp.mixItems),
      packagingSelections: normalizePackagingSelections(rp.packagingItems),
      variantRows: normalizeVariantRows(rp.variants),
      userId,
    });

    setIsModalOpen(true);
  };

  const handleEditClick1 = (rp) => {
    setCurrentProduct({
      ...rp,
      productId:
        rp.productId || rp.product_id || rp.ProductId
          ? String(rp.productId || rp.product_id || rp.ProductId)
          : "",
      manufacturerId:
        rp.manufacturerId || rp.manufacturer_id || rp.ManufacturerId
          ? String(rp.manufacturerId || rp.manufacturer_id || rp.ManufacturerId)
          : "",
      date: rp.date ?? "",
      note: rp.note ?? "",
      cost: rp.cost ?? "",
      unitWage: rp.unitWage ?? "",
      purchase_price: rp.purchase_price ?? "",
      sale_price: rp.sale_price ?? "",
      // unitValue: rp.unitValue ?? "",
      // unit: rp.unit ?? "Pcs",
      // hasUnit: !!rp.unitValue,
      materialSelections: normalizeMaterialSelections(rp.mixItems),
      packagingSelections: normalizePackagingSelections(rp.packagingItems),
      variantRows: normalizeVariantRows(rp.variants),
      userId,
    });

    setIsModalOpen2(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.productId) {
      return toast.error("Please select a product");
    }

    if (
      shouldShowCreateVariantOptions &&
      Number(createVariantQuantityTotal) <= 0
    ) {
      return toast.error("Please enter valid variant quantity");
    }

    if (!createProduct.combo || Number(createProduct.combo) <= 0) {
      return toast.error("Please enter valid combo quantity");
    }

    if (createManufactureItems.length) {
      const materialError = validateMaterialSelections(
        createProduct.materialSelections,
      );
      if (materialError) return toast.error(materialError);
    }

    const packagingError = validatePackagingSelections(
      createProduct.packagingSelections,
    );
    if (packagingError) return toast.error(packagingError);

    try {
      const finalNote = buildMixerMaterialNote(
        createManufactureItems,
        normalizeMaterialSelections(createProduct.materialSelections),
        [
          buildMixerVariantNote(createProduct.variantRows),
          createProduct.note || "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

      const payload = {
        productId: Number(createProduct.productId) || "",
        manufacturerId: Number(createProduct.manufacturerId) || "",
        warehouseId: Number(createProduct.warehouseId) || null,
        combo: Number(createProduct.combo) || 0,
        unitWage: Number(createProduct.unitWage) || 0,
        variants: getNormalizedVariantsPayload(createProduct.variantRows),
        purchase_price: Number(createProduct.purchase_price) || 0,
        sale_price: Number(createProduct.sale_price) || 0,
        mixItems: buildMaterialPayload(
          createProduct.materialSelections,
          createManufactureItems,
        ),
        packagingItems: buildPackagingPayload(createProduct.packagingSelections),
        // unit: createProduct.unit || "Pcs",
        // unitValue: createProduct.hasUnit
        //   ? Number(createProduct.unitValue) || 0
        //   : 0,
        // cost: Number(createProduct.cost) || 0,
        date: createProduct.date || "",
        note: finalNote,
        userId: Number(userId) || 0,
        actorRole: role,
      };

      const res = await insertMixer(payload).unwrap();

      if (res?.success) {
        toast.success("Successfully created!");
        setIsModalOpen1(false);
        setCreateProduct(initialCreateProduct);
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdateProduct = async () => {
    try {
      if (
        shouldShowEditVariantOptions &&
        Number(editVariantQuantityTotal) <= 0
      ) {
        return toast.error("Please enter valid variant quantity");
      }

      if (!currentProduct?.combo || Number(currentProduct.combo) <= 0) {
        return toast.error("Please enter valid combo quantity");
      }

      if (currentManufactureItems.length) {
        const materialError = validateMaterialSelections(
          currentProduct?.materialSelections,
        );
        if (materialError) return toast.error(materialError);
      }

      const packagingError = validatePackagingSelections(
        currentProduct?.packagingSelections,
      );
      if (packagingError) return toast.error(packagingError);

      const finalNote = buildMixerMaterialNote(
        currentManufactureItems,
        normalizeMaterialSelections(currentProduct?.materialSelections),
        [
          buildMixerVariantNote(currentProduct?.variantRows),
          currentProduct?.note || "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

      const payload = {
        productId: Number(currentProduct.productId) || "",
        manufacturerId: Number(currentProduct.manufacturerId) || "",
        warehouseId: Number(currentProduct.warehouseId) || null,
        combo: Number(currentProduct.combo) || 0,
        unitWage: Number(currentProduct.unitWage) || 0,
        variants: getNormalizedVariantsPayload(currentProduct.variantRows),
        purchase_price: Number(currentProduct.purchase_price) || 0,
        sale_price: Number(currentProduct.sale_price) || 0,
        mixItems: buildMaterialPayload(
          currentProduct?.materialSelections,
          currentManufactureItems,
        ),
        packagingItems: buildPackagingPayload(currentProduct?.packagingSelections),
        // unit: currentProduct.unit || "Pcs",
        // unitValue: currentProduct.hasUnit
        //   ? Number(currentProduct.unitValue) || 0
        //   : 0,
        // cost: Number(currentProduct.cost) || 0,
        date: currentProduct.date || "",
        note: finalNote,
        userId: Number(currentProduct.userId) || 0,
        actorRole: role,
      };

      const res = await updateMixer({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        setCurrentProduct(null);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (!currentProduct?.note?.trim()) {
      return toast.error("Note is required!");
    }

    try {
      const payload = {
        itemId: Number(currentProduct.itemId) || "",
        // unit: currentProduct.unit || "Pcs",
        // unitValue: currentProduct.hasUnit
        //   ? Number(currentProduct.unitValue) || 0
        //   : 0,
        // cost: Number(currentProduct.cost) || 0,
        date: currentProduct.date || "",
        note: currentProduct.note || "",
        userId: Number(currentProduct.userId) || 0,
        actorRole: role,
      };

      const res = await updateMixer({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen2(false);
        setCurrentProduct(null);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this product?",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteMixer(id).unwrap();

      if (res?.success !== false) {
        toast.success("Product deleted successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setItemName("");
  };

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
    setNoteContent("");
  };

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({ ...base, borderRadius: 14, overflow: "hidden" }),
  };

  const handleCreateMaterialSelectionChange = (index, key, value) => {
    setCreateProduct((prev) => {
      const nextSelections = [...(prev.materialSelections || [])];
      nextSelections[index] = {
        ...nextSelections[index],
        [key]: value,
      };
      return {
        ...prev,
        materialSelections: nextSelections,
      };
    });
  };

  const handleCurrentMaterialSelectionChange = (index, key, value) => {
    setCurrentProduct((prev) => {
      const nextSelections = [...(prev?.materialSelections || [])];
      nextSelections[index] = {
        ...nextSelections[index],
        [key]: value,
      };
      return {
        ...prev,
        materialSelections: nextSelections,
      };
    });
  };

  const addMaterialSelectionRow = (mode) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => ({
      ...prev,
      materialSelections: [
        ...normalizeMaterialSelections(prev?.materialSelections),
        createEmptyMaterialSelection(),
      ],
    }));
  };

  const removeMaterialSelectionRow = (mode, index) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => {
      const nextSelections = normalizeMaterialSelections(
        prev?.materialSelections,
      ).filter((_, rowIndex) => rowIndex !== index);

      return {
        ...prev,
        materialSelections: nextSelections.length
          ? nextSelections
          : [createEmptyMaterialSelection()],
      };
    });
  };

  const handlePackagingSelectionChange = (mode, index, key, value) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => {
      const nextSelections = normalizePackagingSelections(
        prev?.packagingSelections,
      );
      nextSelections[index] = {
        ...nextSelections[index],
        [key]: value,
      };

      return {
        ...prev,
        packagingSelections: nextSelections,
      };
    });
  };

  const handlePackagingItemChange = (mode, index, selected) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => {
      const nextSelections = normalizePackagingSelections(
        prev?.packagingSelections,
      );
      nextSelections[index] = {
        ...nextSelections[index],
        itemMasterId: selected?.value || "",
        unit: selected?.unit || "Pcs",
      };

      return {
        ...prev,
        packagingSelections: nextSelections,
      };
    });
  };

  const addPackagingSelectionRow = (mode) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => ({
      ...prev,
      packagingSelections: [
        ...normalizePackagingSelections(prev?.packagingSelections),
        createEmptyPackagingSelection(),
      ],
    }));
  };

  const removePackagingSelectionRow = (mode, index) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;
    setter((prev) => {
      const nextSelections = normalizePackagingSelections(
        prev?.packagingSelections,
      ).filter((_, rowIndex) => rowIndex !== index);

      return {
        ...prev,
        packagingSelections: nextSelections.length
          ? nextSelections
          : [createEmptyPackagingSelection()],
      };
    });
  };

  const getPackagingOptionByIndex = (selections, index) => {
    const selectedId = String(selections?.[index]?.itemMasterId || "");
    return (
      packagingItemOptions.find((option) => option.value === selectedId) || null
    );
  };

  const renderPackagingSection = (mode, productState) => {
    const selections = normalizePackagingSelections(
      productState?.packagingSelections,
    );

    return (
      <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Packaging
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Select packaging items from item stock.
            </p>
          </div>
          <button
            type="button"
            onClick={() => addPackagingSelectionRow(mode)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Plus size={14} />
            Add Packaging
          </button>
        </div>

        <div className="space-y-4">
          {selections.map((selection, index) => {
            const selectedOption = getPackagingOptionByIndex(selections, index);

            return (
              <div
                key={`${mode}-packaging-${index}`}
                className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_150px_100px_130px_150px_44px] gap-3 rounded-2xl border border-indigo-100 bg-white/70 p-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Packaging Item {index + 1}
                  </label>
                  <Select
                    options={packagingItemOptions}
                    value={selectedOption}
                    onChange={(selected) =>
                      handlePackagingItemChange(mode, index, selected)
                    }
                    placeholder="Select packaging item..."
                    isClearable
                    styles={selectStyles}
                    className="text-sm text-black font-medium"
                    isDisabled={isLoadingItemMaster}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={selection.value || ""}
                    onChange={(e) =>
                      handlePackagingSelectionChange(
                        mode,
                        index,
                        "value",
                        e.target.value,
                      )
                    }
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Unit
                  </label>
                  <div className="flex h-11 w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                    {selection.unit || selectedOption?.unit || "Pcs"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={selection.quantity || ""}
                    onChange={(e) =>
                      handlePackagingSelectionChange(
                        mode,
                        index,
                        "quantity",
                        e.target.value,
                      )
                    }
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                    Total
                  </label>
                  <div className="flex h-11 w-full items-center rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-black text-indigo-700">
                    {getPackagingTotal(selection).toLocaleString()}
                  </div>
                </div>

                {selections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackagingSelectionRow(mode, index)}
                    className="lg:mt-6 inline-flex h-11 w-full lg:w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition active:scale-95"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getCreateManufactureItemByIndex = (index) => {
    const selectedId = String(
      createProduct?.materialSelections?.[index]?.manufactureId || "",
    );

    return createManufactureItems.find((item) => item.id === selectedId) || null;
  };

  const getCurrentManufactureItemByIndex = (index) => {
    const selectedId = String(
      currentProduct?.materialSelections?.[index]?.manufactureId || "",
    );

    return currentManufactureItems.find((item) => item.id === selectedId) || null;
  };

  const renderVariantOptions = ({
    mode,
    rows,
    sizeOptions,
    colorOptions,
    selectedProductData,
  }) => (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
            Product Variants
          </h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Select size, color and quantity combinations for this mixer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => addVariantRow(mode)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Plus size={14} />
          Add Variant
        </button>
      </div>

      {normalizeVariantRows(rows).map((row, index) => {
        const availableColorOptions = row.size
          ? getVariationColorsForSize(selectedProductData, row.size)
          : colorOptions;

        return (
          <div
            key={`${mode}-variant-${index}`}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Size / Code
              </label>
              <Select
                options={sizeOptions}
                value={
                  sizeOptions.find((option) => option.value === row.size) ||
                  null
                }
                onChange={(selected) =>
                  updateVariantRow(mode, index, "size", selected?.value || "")
                }
                placeholder="Select size..."
                isClearable
                styles={selectStyles}
                className="text-sm text-black font-medium"
                isDisabled={sizeOptions.length === 0}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Color
              </label>
              <Select
                options={availableColorOptions}
                value={
                  availableColorOptions.find(
                    (option) => option.value === row.color,
                  ) || null
                }
                onChange={(selected) =>
                  updateVariantRow(mode, index, "color", selected?.value || "")
                }
                placeholder="Select color..."
                isClearable
                styles={selectStyles}
                className="text-sm text-black font-medium"
                isDisabled={!row.size || availableColorOptions.length === 0}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Quantity
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={row.quantity}
                onChange={(e) =>
                  updateVariantRow(mode, index, "quantity", e.target.value)
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Purchase Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={row.purchase_price}
                onChange={(e) =>
                  updateVariantRow(mode, index, "purchase_price", e.target.value)
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Sale Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={row.sale_price}
                onChange={(e) =>
                  updateVariantRow(mode, index, "sale_price", e.target.value)
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="button"
              onClick={() => removeVariantRow(mode, index)}
              className="sm:col-span-1 h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
              disabled={normalizeVariantRows(rows).length === 1}
            >
              <X size={16} className="mx-auto" />
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderOutputPriceFields = (mode, productState) => {
    const setter = mode === "edit" ? setCurrentProduct : setCreateProduct;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
            Purchase Price
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={productState?.purchase_price || ""}
            onChange={(e) =>
              setter((prev) => ({ ...prev, purchase_price: e.target.value }))
            }
            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
            Sale Price
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={productState?.sale_price || ""}
            onChange={(e) =>
              setter((prev) => ({ ...prev, sale_price: e.target.value }))
            }
            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(15,23,42,0.04)] rounded-2xl p-4 sm:p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.mixer_history || "Mixer History"}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {t.track_mixer_entries || "Track and manage mixer entries"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-2xl shadow-sm shadow-indigo-50">
            <div className="h-8 w-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
              <ShoppingBasket size={18} />
            </div>
            <div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                {t.total_entries || "Total Entries"}
              </div>
              <div className="text-base font-black text-indigo-900 tabular-nums leading-none">
                {isLoading ? "..." : (data?.meta?.count ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddProduct}
            className="group relative inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden w-full sm:w-auto"
          >
            <Plus size={18} /> {t.add_new || "Add New"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 items-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.per_page_label || "Per Page"}
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-bold text-sm appearance-none cursor-pointer"
          >
            {[10, 20, 50, 100].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
            {t.product || "Product"}
          </label>
          <Select
            options={productDropdownOptions}
            value={
              productDropdownOptions.find((o) => o.label === itemName) || null
            }
            onChange={(selected) => setItemName(selected?.label || "")}
            placeholder={t.search || "Search"}
            isClearable
            isDisabled={isLoadingAllProducts}
            styles={selectStyles}
            className="text-black"
          />
        </div>

        <button
          type="button"
          className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 transition rounded-xl px-4 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
          onClick={clearFilters}
        >
          <X size={16} /> {t.clear_filters || "Clear Filters"}
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.date || "Date"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.product || "Product"}
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Manufacturer
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Combo Qty
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Unit Wage
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Wage Amount
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Manufacture Items
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  Packaging Items
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.status || "Status"}
                </th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t.actions || "Actions"}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((rp) => (
                <motion.tr
                  key={rp.Id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-50 group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {rp.date || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">
                      {resolveItemName(rp)}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {rp.manufacturerName || "-"}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.combo || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {Number(rp.unitWage || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                    {Number(rp.wageAmount || 0).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700 max-w-[220px]">
                    {summarizeSelections(
                      rp.mixItems,
                      "manufactureId",
                      itemMasterNameMap,
                      "Manufacture Item",
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-700 max-w-[220px]">
                    {summarizeSelections(
                      rp.packagingItems,
                      "itemMasterId",
                      itemMasterNameMap,
                      "Packaging Item",
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                        rp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100"
                          : rp.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100"
                            : "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100"
                      }`}
                    >
                      {rp.status || "Active"}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {rp.note ? (
                        <div className="relative">
                          <button
                            className="relative h-10 w-10 rounded-md flex items-center justify-center"
                            title={rp.note}
                            type="button"
                            onClick={() => handleNoteClick(rp.note)}
                          >
                            <Notebook size={18} className="text-slate-700" />
                          </button>

                          <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                            1
                          </span>
                        </div>
                      ) : (
                        <button
                          className="h-10 w-10 rounded-md flex items-center justify-center cursor-default"
                          title={t.no_note_available || "No note available"}
                          type="button"
                        >
                          <Notebook size={18} className="text-slate-300" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleEditClick(rp)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition shadow-sm"
                        title={t.edit_record || "Edit"}
                      >
                        <Edit size={16} />
                      </button>

                      {role === "superAdmin" || role === "admin" ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(rp.Id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                          title={t.delete_record || "Delete"}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEditClick1(rp)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition shadow-sm"
                          title={t.request_delete || "Request Delete"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-20 text-center text-sm text-slate-400 italic"
                  >
                    {t.no_data_found || "No data found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 gap-6 px-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {t.showing_page || "Showing Page"}{" "}
          <span className="text-indigo-600">{currentPage}</span> {t.of || "of"}{" "}
          <span className="text-slate-900">{totalPages}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousSet}
            disabled={startPage === 1}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            <ChevronLeft size={16} /> {t.prev || "Prev"}
          </button>

          <div className="flex items-center gap-1.5">
            {[...Array(endPage - startPage + 1)].map((_, index) => {
              const pageNum = startPage + index;
              const active = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-11 w-11 rounded-2xl font-black text-sm transition-all active:scale-90 ${
                    active
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                      : "bg-white text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextSet}
            disabled={endPage === totalPages}
            className="h-11 px-5 border border-slate-200 rounded-2xl bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition active:scale-95 flex items-center gap-2 shadow-sm"
          >
            {t.next || "Next"} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title={t.note_preview || "Note Preview"}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-h-[120px]">
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent || t.no_note_available || "No note available."}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNoteModalClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              {t.done || "Done"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title={t.edit_record || "Edit Record"}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(currentProduct?.productId),
                ) || null
              }
              onChange={(selected) =>
                setCurrentProduct((prev) => ({
                  ...prev,
                  productId: selected?.value || "",
                  combo: "",
                  purchase_price: "",
                  sale_price: "",
                  materialSelections: [createEmptyMaterialSelection()],
                  variantRows: [createEmptyVariantRow()],
                }))
              }
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              className="text-sm font-medium"
              isDisabled={isLoadingAllProducts}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Manufacturer
            </label>
            <Select
              options={manufacturerDropdownOptions}
              value={
                manufacturerDropdownOptions.find(
                  (o) => o.value === String(currentProduct?.manufacturerId),
                ) || null
              }
              onChange={(selected) =>
                setCurrentProduct((prev) => ({
                  ...prev,
                  manufacturerId: selected?.value || "",
                  materialSelections: [createEmptyMaterialSelection()],
                }))
              }
              placeholder="Select manufacturer..."
              isClearable
              styles={selectStyles}
              className="text-sm font-medium"
              isDisabled={isLoadingManufacturers}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Warehouse
            </label>
            <Select
              options={warehouseDropdownOptions}
              value={
                warehouseDropdownOptions.find(
                  (o) => o.value === String(currentProduct?.warehouseId),
                ) || null
              }
              onChange={(selected) =>
                setCurrentProduct((prev) => ({
                  ...prev,
                  warehouseId: selected?.value || "",
                }))
              }
              placeholder="Select warehouse..."
              isClearable
              styles={selectStyles}
              className="text-sm font-medium"
              isDisabled={isLoadingWarehouses}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.date || "Date"}
            </label>
            <input
              type="date"
              value={currentProduct?.date || ""}
              onChange={(e) =>
                setCurrentProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Combo Quantity
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={currentProduct?.combo || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, combo: e.target.value }))
                }
                disabled={shouldShowEditVariantOptions}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder={
                  shouldShowEditVariantOptions
                    ? "Auto calculated from variants"
                    : "Enter combo quantity"
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Unit Wage
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={currentProduct?.unitWage || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, unitWage: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                placeholder="Enter unit wage"
              />
            </div>
          </div>

          {!shouldShowEditVariantOptions &&
            renderOutputPriceFields("edit", currentProduct)}

          {currentProduct?.productId && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Manufacture Items
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Select manufacture items for this mixer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addMaterialSelectionRow("edit")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Manufacture
                </button>
              </div>

              {isLoadingCurrentManufactureStock ? (
                <p className="text-sm font-medium text-slate-500">
                  Loading manufacture items...
                </p>
              ) : currentManufactureItems.length > 0 ? (
                <div className="space-y-4">
                  {normalizeMaterialSelections(
                    currentProduct?.materialSelections,
                  ).map((_, index) => (
                    <div
                      key={`current-material-${index}`}
                      className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_180px_130px_150px_44px] gap-3 rounded-2xl border border-indigo-100 bg-white/70 p-3"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Manufacture Item {index + 1}
                        </label>
                        <Select
                          options={currentManufactureOptions}
                          value={
                            currentManufactureOptions.find(
                              (option) =>
                                option.value ===
                                String(
                                  currentProduct?.materialSelections?.[index]
                                    ?.manufactureId || "",
                                ),
                            ) || null
                          }
                          onChange={(selected) =>
                            handleCurrentMaterialSelectionChange(
                              index,
                              "manufactureId",
                              selected?.value || "",
                            )
                          }
                          placeholder="Select manufacture item..."
                          isClearable
                          styles={selectStyles}
                          className="text-sm text-black font-medium"
                        />
                        <p className="mt-1.5 ml-1 text-[11px] font-medium text-slate-500">
                          Unit:{" "}
                          {formatManufactureItemUnit(
                            getCurrentManufactureItemByIndex(index),
                          )}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Value
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              currentProduct?.materialSelections?.[index]
                                ?.value || ""
                            }
                            onChange={(e) =>
                              handleCurrentMaterialSelectionChange(
                                index,
                                "value",
                                e.target.value,
                              )
                            }
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                          />
                          <span className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600">
                            {getManufactureItemUnitLabel(
                              getCurrentManufactureItemByIndex(index),
                            )}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            currentProduct?.materialSelections?.[index]
                              ?.quantity || ""
                          }
                          onChange={(e) =>
                            handleCurrentMaterialSelectionChange(
                              index,
                              "quantity",
                              e.target.value,
                            )
                          }
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Total
                        </label>
                        <div className="flex h-11 w-full items-center rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-black text-indigo-700">
                          {getMaterialTotal(
                            currentProduct?.materialSelections?.[index],
                          ).toLocaleString()}
                        </div>
                      </div>
                      {normalizeMaterialSelections(
                        currentProduct?.materialSelections,
                      ).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMaterialSelectionRow("edit", index)}
                          className="lg:mt-6 inline-flex h-11 w-full lg:w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition active:scale-95"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  No manufacture items found for this product.
                </p>
              )}
            </div>
          )}

          {renderPackagingSection("edit", currentProduct)}

          {shouldShowEditVariantOptions &&
            renderVariantOptions({
              mode: "edit",
              rows: currentProduct?.variantRows,
              sizeOptions: editSizeOptions,
              colorOptions: editColorOptions,
              selectedProductData: selectedEditProductData,
            })}

          {role === "superAdmin" || role === "admin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.status || "Status"}
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: e.target.value,
                  })
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              >
                <option value="Pending">{t.pending || "Pending"}</option>
                <option value="Active">{t.active || "Active"}</option>
                <option value="Approved">{t.approved || "Approved"}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.note || "Note"}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full min-h-[90px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder={t.extra_details || "Extra details..."}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
          <button
            onClick={handleModalClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
          >
            {t.cancel || "Cancel"}
          </button>
          <button
            onClick={handleUpdateProduct}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
          >
            {t.update_changes || "Update Changes"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title={t.add_new || "Add New"}
        maxWidth="max-w-5xl"
      >
        <form
          onSubmit={handleCreateProduct}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.select_product || "Select Product"}
            </label>
            <Select
              options={productDropdownOptions}
              value={
                productDropdownOptions.find(
                  (o) => o.value === String(createProduct.productId),
                ) || null
              }
              onChange={(selected) =>
                setCreateProduct((prev) => ({
                  ...prev,
                  productId: selected?.value || "",
                  combo: "",
                  purchase_price: "",
                  sale_price: "",
                  materialSelections: [createEmptyMaterialSelection()],
                  variantRows: [createEmptyVariantRow()],
                }))
              }
              placeholder={t.search_product || "Search product..."}
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingAllProducts}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Manufacturer
            </label>
            <Select
              options={manufacturerDropdownOptions}
              value={
                manufacturerDropdownOptions.find(
                  (o) => o.value === String(createProduct.manufacturerId),
                ) || null
              }
              onChange={(selected) =>
                setCreateProduct((prev) => ({
                  ...prev,
                  manufacturerId: selected?.value || "",
                  materialSelections: [createEmptyMaterialSelection()],
                }))
              }
              placeholder="Select manufacturer..."
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingManufacturers}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              Warehouse
            </label>
            <Select
              options={warehouseDropdownOptions}
              value={
                warehouseDropdownOptions.find(
                  (o) => o.value === String(createProduct.warehouseId),
                ) || null
              }
              onChange={(selected) =>
                setCreateProduct((prev) => ({
                  ...prev,
                  warehouseId: selected?.value || "",
                }))
              }
              placeholder="Select warehouse..."
              isClearable
              styles={selectStyles}
              className="text-sm text-black font-medium"
              isDisabled={isLoadingWarehouses}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.date || "Date"}
            </label>
            <input
              type="date"
              value={createProduct?.date || ""}
              onChange={(e) =>
                setCreateProduct((p) => ({ ...p, date: e.target.value }))
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div>

          {/* <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                  {t.unit_settings || "Unit Settings"}
                </span>
                <p className="text-[10px] font-bold text-slate-400">
                  {t.enable_if_needed || "Enable if needed"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateProduct((prev) => ({
                    ...prev,
                    hasUnit: !prev?.hasUnit,
                    unitValue: prev?.hasUnit ? "" : prev?.unitValue || "",
                    unit: prev?.hasUnit ? "Pcs" : prev?.unit || "Pcs",
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  createProduct?.hasUnit ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Unit</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    createProduct?.hasUnit ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {createProduct?.hasUnit && (
              <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t.unit_details || "Unit Details"}
                </label>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={createProduct?.unitValue || ""}
                    onChange={(e) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        unitValue: e.target.value,
                      }))
                    }
                    placeholder="30"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />

                  <select
                    value={createProduct?.unit || "Pcs"}
                    onChange={(e) =>
                      setCreateProduct((prev) => ({
                        ...prev,
                        unit: e.target.value,
                      }))
                    }
                    className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition appearance-none cursor-pointer"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Liter">Liter</option>
                    <option value="Box">Box</option>
                    <option value="Dozen">Dozen</option>
                  </select>
                </div>
              </div>
            )}
          </div> */}

          {/* <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.cost || "Cost"}
            </label>
            <input
              type="number"
              step="0.01"
              value={createProduct?.cost || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, cost: e.target.value })
              }
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
            />
          </div> */}

          {createProduct?.productId && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Manufacture Items
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Select manufacture items for this mixer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addMaterialSelectionRow("create")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Manufacture
                </button>
              </div>

              {isLoadingCreateManufactureStock ? (
                <p className="text-sm font-medium text-slate-500">
                  Loading manufacture items...
                </p>
              ) : createManufactureItems.length > 0 ? (
                <div className="space-y-4">
                  {normalizeMaterialSelections(
                    createProduct.materialSelections,
                  ).map((_, index) => (
                    <div
                      key={`create-material-${index}`}
                      className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr)_180px_130px_150px_44px] gap-3 rounded-2xl border border-indigo-100 bg-white/70 p-3"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Manufacture Item {index + 1}
                        </label>
                        <Select
                          options={createManufactureOptions}
                          value={
                            createManufactureOptions.find(
                              (option) =>
                                option.value ===
                                String(
                                  createProduct?.materialSelections?.[index]
                                    ?.manufactureId || "",
                                ),
                            ) || null
                          }
                          onChange={(selected) =>
                            handleCreateMaterialSelectionChange(
                              index,
                              "manufactureId",
                              selected?.value || "",
                            )
                          }
                          placeholder="Select manufacture item..."
                          isClearable
                          styles={selectStyles}
                          className="text-sm text-black font-medium"
                        />
                        <p className="mt-1.5 ml-1 text-[11px] font-medium text-slate-500">
                          Unit:{" "}
                          {formatManufactureItemUnit(
                            getCreateManufactureItemByIndex(index),
                          )}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Value
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={
                              createProduct?.materialSelections?.[index]
                                ?.value || ""
                            }
                            onChange={(e) =>
                              handleCreateMaterialSelectionChange(
                                index,
                                "value",
                                e.target.value,
                              )
                            }
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                          />
                          <span className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-600">
                            {getManufactureItemUnitLabel(
                              getCreateManufactureItemByIndex(index),
                            )}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={
                            createProduct?.materialSelections?.[index]
                              ?.quantity || ""
                          }
                          onChange={(e) =>
                            handleCreateMaterialSelectionChange(
                              index,
                              "quantity",
                              e.target.value,
                            )
                          }
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                          Total
                        </label>
                        <div className="flex h-11 w-full items-center rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-black text-indigo-700">
                          {getMaterialTotal(
                            createProduct?.materialSelections?.[index],
                          ).toLocaleString()}
                        </div>
                      </div>
                      {normalizeMaterialSelections(
                        createProduct.materialSelections,
                      ).length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeMaterialSelectionRow("create", index)
                          }
                          className="lg:mt-6 inline-flex h-11 w-full lg:w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition active:scale-95"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  No manufacture items found for this product.
                </p>
              )}
            </div>
          )}

          {renderPackagingSection("create", createProduct)}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Combo Quantity
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={createProduct?.combo || ""}
                onChange={(e) =>
                  setCreateProduct((p) => ({ ...p, combo: e.target.value }))
                }
                disabled={shouldShowCreateVariantOptions}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder={
                  shouldShowCreateVariantOptions
                    ? "Auto calculated from variants"
                    : "Enter combo quantity"
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Unit Wage
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createProduct?.unitWage || ""}
                onChange={(e) =>
                  setCreateProduct((p) => ({ ...p, unitWage: e.target.value }))
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                placeholder="Enter unit wage"
              />
            </div>
          </div>
          {!shouldShowCreateVariantOptions &&
            renderOutputPriceFields("create", createProduct)}

          {shouldShowCreateVariantOptions &&
            renderVariantOptions({
              mode: "create",
              rows: createProduct?.variantRows,
              sizeOptions: createSizeOptions,
              colorOptions: createColorOptions,
              selectedProductData: selectedCreateProductData,
            })}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.note || "Note"}
            </label>
            <textarea
              value={createProduct?.note || ""}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, note: e.target.value })
              }
              className="w-full min-h-[80px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
              placeholder={t.add_extra_info || "Add any extra info..."}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95"
            >
              {t.save || "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={handleModalClose2}
        title={t.action_confirmation || "Action Confirmation"}
      >
        <div className="space-y-4">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.update_status || "Update Status"}
              </label>
              <select
                value={currentProduct?.status || ""}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: e.target.value,
                  })
                }
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              >
                <option value="Pending">{t.pending || "Pending"}</option>
                <option value="Active">{t.active || "Active"}</option>
                <option value="Approved">{t.approved || "Approved"}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                {t.reason_for_removal || "Reason for Removal"}
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full min-h-[120px] border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                placeholder={
                  t.explain_why_remove_record ||
                  "Please explain why you want to remove this record..."
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose2}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              {t.cancel || "Cancel"}
            </button>

            <button
              onClick={handleUpdateProduct1}
              className="px-8 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition shadow-md shadow-amber-100 active:scale-95"
            >
              {t.submit_request || "Submit Request"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default MixerTable;
