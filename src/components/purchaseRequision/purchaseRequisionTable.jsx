import { motion } from "framer-motion";
import {
  Edit,
  Notebook,
  Plus,
  Printer,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  useDeletePurchaseRequisitionMutation,
  useGetAllPurchaseRequisitionQuery,
  useInsertPurchaseRequisitionMutation,
  useUpdatePurchaseRequisitionMutation,
} from "../../features/purchaseRequisition/purchaseRequisition";

import { useGetAllSupplierWithoutQueryQuery } from "../../features/supplier/supplier";
import { useGetAllWirehouseWithoutQueryQuery } from "../../features/wirehouse/wirehouse";
import { useGetAllBankAccountWithoutQueryQuery } from "../../features/bankAccount/bankAccount";
import Modal from "../common/Modal";
import DateRangeFilter from "../common/DateRangeFilter";
import DocumentBrand from "../common/DocumentBrand";
import {
  useGetAllProductWithoutQueryQuery,
  useGetSingleReceivedProductByIdQuery,
} from "../../features/product/product";
import { useSingleUserQuery } from "../../features/auth/auth";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetAllInventoryOverviewWithoutQueryQuery } from "../../features/inventoryOverview/inventoryOverview";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { translations } from "../../utils/translations";
import { useLayout } from "../../context/LayoutContext";

const blankIfZero = (value) => (Number(value) === 0 ? "" : (value ?? ""));

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatOptionalMoney = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return formatMoney(value);
};

const getUnitPrice = (total, quantity) => {
  const amount = Number(total || 0);
  const qty = Number(quantity || 0);
  if (!amount || !qty) return 0;
  return amount / qty;
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

const parsePurchaseRequisitionItems = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getPurchaseRequisitionRowItems = (record) => {
  const items = parsePurchaseRequisitionItems(record?.items);
  return items.length ? items : [record];
};

const getPurchaseRequisitionItemsTotalQuantity = (items = []) =>
  items.reduce((total, item) => total + (Number(item?.quantity) || 0), 0);

const getPurchaseRequisitionItemsTotalAmount = (items = []) =>
  items.reduce((total, item) => total + (Number(item?.amount) || 0), 0);

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

const toDateInputValue = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
};

const makeSelectValue = (options, value, fallbackLabel) => {
  if (value === undefined || value === null || value === "") return null;

  const stringValue = String(value);
  return (
    options.find((option) => String(option.value) === stringValue) || {
      value: stringValue,
      label: fallbackLabel || stringValue,
    }
  );
};

const purchaseRequisitionStatusesByRole = {
  superAdmin: ["Pending", "Approved"],
  admin: ["Pending", "Approved"],
  accountant: ["Pay For Purchase", "Completed"],
  inventor: ["Product Received"],
};

const purchaseRequisitionStatusClasses = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pay For Purchase": "bg-sky-50 text-sky-700 border-sky-200",
  "Product Received": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Completed: "bg-violet-50 text-violet-700 border-violet-200",
  Active: "bg-blue-50 text-blue-700 border-blue-200",
};

const getPurchaseRequisitionStatusClass = (status) =>
  purchaseRequisitionStatusClasses[status] ||
  "bg-slate-50 text-slate-700 border-slate-200";

const initialCreateProduct = {
  warehouseId: "",
  supplierId: "",
  bookId: "",
  paymentMode: "",
  bankName: "",
  bankAccount: "",
  productId: "",
  variantRows: [createEmptyVariantRow()],
  quantity: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
  status: "",
  file: null,
};

const initialBulkAddProduct = {
  productId: "",
  variantRows: [createEmptyVariantRow()],
  quantity: "",
  amount: "",
};

const PurchaseRequisionTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const [user, setUser] = useState(null);
  const purchaseRequisitionStatuses =
    purchaseRequisitionStatusesByRole[role] || [];
  const canUpdatePurchaseRequisitionStatus =
    purchaseRequisitionStatuses.length > 0;

  const [isModalOpen, setIsModalOpen] = useState(false); // Edit modal
  const [isModalOpen1, setIsModalOpen1] = useState(false); // Add modal
  const [isModalOpen2, setIsModalOpen2] = useState(false); // Note / status modal
  const [currentProduct, setCurrentProduct] = useState(null);

  // ✅ Fetch user (query)
  const {
    data: userRes,
    isLoading: isLoadingUser,
    isError: isErrorUser,
    error: errorUser,
  } = useSingleUserQuery(userId, {});

  useEffect(() => {
    if (isErrorUser) console.error("Error:", errorUser);
    if (!isLoadingUser && userRes?.data) {
      setUser(userRes.data);
    }
  }, [userRes, isLoadingUser, isErrorUser, errorUser]);

  const [warehouse, setWarehouse] = useState("");
  const [supplier, setSupplier] = useState("");

  // ✅ Add form (INSERT) -> productId (Id)
  const [createProduct, setCreateProduct] = useState(initialCreateProduct);
  const [createProductItems, setCreateProductItems] = useState([]);
  const [bulkAddProduct, setBulkAddProduct] = useState(initialBulkAddProduct);

  const [rows, setRows] = useState([]);

  // ✅ Filters: start/end + product NAME
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productName, setProductName] = useState("");

  //Pagination calculation start
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

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
  }, [startDate, endDate, productName, itemsPerPage]);

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
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  //Pagination calculation end

  // ✅ startDate > endDate fix
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // ✅ All products (for dropdown + name mapping)
  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllProductWithoutQueryQuery();

  const productsData = useMemo(
    () => allProductsRes?.data || [],
    [allProductsRes],
  );

  useEffect(() => {
    if (isErrorAllProducts)
      console.error("Error fetching products", errorAllProducts);
  }, [isErrorAllProducts, errorAllProducts]);

  const { data: inventoryRes } = useGetAllInventoryOverviewWithoutQueryQuery();
  const receivedData = inventoryRes?.data || [];

  const getInventoryRecordForProduct = (productId, fallbackName = "") => {
    const normalizedName = String(fallbackName || "")
      .trim()
      .toLowerCase();

    const idMatch = productId
      ? receivedData.find(
          (r) =>
            Number(r.productId) === Number(productId) ||
            Number(r.ProductId) === Number(productId) ||
            Number(r.product?.Id) === Number(productId) ||
            Number(r.product?.id) === Number(productId),
        )
      : null;

    if (idMatch) return idMatch;

    return normalizedName
      ? receivedData.find(
          (r) =>
            String(r.name || "")
              .trim()
              .toLowerCase() === normalizedName,
        ) || null
      : null;
  };

  const getInventoryQuantityForProduct = (productId, fallbackName = "") =>
    Number(
      getInventoryRecordForProduct(productId, fallbackName)?.quantity || 0,
    );

  const getInventoryQuantityForVariant = (
    productId,
    variant,
    fallbackName = "",
  ) => {
    if (!variant?.size && !variant?.color) return null;

    const stockRecord = getInventoryRecordForProduct(productId, fallbackName);
    const match = getVariantDisplayRows(stockRecord).find(
      (row) =>
        String(row.size || "") === String(variant?.size || "") &&
        String(row.color || "") === String(variant?.color || ""),
    );

    return match ? Number(match.quantity || 0) : 0;
  };

  // ✅ Dropdown options (value = Id, label = name)

  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: String(p.Id),
      label: p.name,
    }));
  }, [productsData]);

  const selectedCreateProductId = createProduct?.productId || undefined;
  const selectedEditProductId = currentProduct?.productId || undefined;
  const selectedBulkAddProductId = bulkAddProduct?.productId || undefined;

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
  const {
    data: selectedBulkAddProductRes,
    isFetching: isFetchingBulkAddProduct,
  } = useGetSingleReceivedProductByIdQuery(selectedBulkAddProductId, {
    skip: !selectedBulkAddProductId,
  });

  const selectedCreateProductData =
    selectedCreateProductRes?.data || selectedCreateProductRes;
  const selectedEditProductData =
    selectedEditProductRes?.data || selectedEditProductRes;
  const selectedBulkAddProductData =
    selectedBulkAddProductRes?.data || selectedBulkAddProductRes;
  const selectedCreateProductDataId = selectedCreateProductData
    ? String(selectedCreateProductData.Id ?? selectedCreateProductData.id ?? "")
    : "";
  const isSelectedCreateProductDataCurrent = Boolean(
    createProduct.productId &&
    selectedCreateProductDataId &&
    selectedCreateProductDataId === String(createProduct.productId),
  );
  const selectedCreateProductVariants = useMemo(
    () =>
      isSelectedCreateProductDataCurrent
        ? getVariantRowsFromProduct(selectedCreateProductData)
        : [],
    [isSelectedCreateProductDataCurrent, selectedCreateProductData],
  );

  const createSizeOptions = useMemo(
    () =>
      isSelectedCreateProductDataCurrent
        ? getVariationOptions(selectedCreateProductData, "size")
        : [],
    [isSelectedCreateProductDataCurrent, selectedCreateProductData],
  );
  const createColorOptions = useMemo(
    () =>
      isSelectedCreateProductDataCurrent
        ? getVariationOptions(selectedCreateProductData, "color")
        : [],
    [isSelectedCreateProductDataCurrent, selectedCreateProductData],
  );
  const shouldShowCreateVariantOptions = Boolean(
    !isFetchingCreateProduct &&
    isSelectedCreateProductDataCurrent &&
    selectedCreateProductVariants.length > 0,
  );
  const editSizeOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "size"),
    [selectedEditProductData],
  );
  const editColorOptions = useMemo(
    () => getVariationOptions(selectedEditProductData, "color"),
    [selectedEditProductData],
  );
  const bulkAddSizeOptions = useMemo(
    () => getVariationOptions(selectedBulkAddProductData, "size"),
    [selectedBulkAddProductData],
  );
  const bulkAddColorOptions = useMemo(
    () => getVariationOptions(selectedBulkAddProductData, "color"),
    [selectedBulkAddProductData],
  );
  const shouldShowEditVariantOptions = useMemo(
    () =>
      hasConfiguredVariants(currentProduct?.variantRows) ||
      (!isFetchingEditProduct &&
        getVariantRowsFromProduct(selectedEditProductData).length > 0),
    [
      currentProduct?.variantRows,
      isFetchingEditProduct,
      selectedEditProductData,
    ],
  );
  const shouldShowBulkAddVariantOptions = useMemo(
    () =>
      !isFetchingBulkAddProduct &&
      getVariantRowsFromProduct(selectedBulkAddProductData).length > 0,
    [isFetchingBulkAddProduct, selectedBulkAddProductData],
  );

  // ✅ productId -> productName map
  // const productNameMap = useMemo(() => {
  //   const m = new Map();
  //   (productsData || []).forEach((p) => {
  //     const key = String(p.Id ?? p.id ?? p._id);
  //     m.set(key, p.name);
  //   });
  //   return m;
  // }, [productsData]);

  const productNameMap = useMemo(() => {
    const m = new Map();
    (productsData || []).forEach((p) => {
      m.set(String(p.Id ?? p.id ?? p._id ?? ""), p.name);
    });
    return m;
  }, [productsData]);

  const productIdByNameMap = useMemo(() => {
    const m = new Map();
    (productsData || []).forEach((p) => {
      m.set(String(p.name).trim().toLowerCase(), String(p.Id));
    });
    return m;
  }, [productsData]);

  // ✅ resolve name for table
  const resolveProductName = (rp) => {
    const pid =
      rp.productId ??
      rp.product_id ??
      rp.ProductId ??
      rp.product?.Id ??
      rp.product?.id ??
      rp.product?._id;

    if (rp.productName) return rp.productName;
    if (rp.product?.name) return rp.product?.name;

    if (pid === null || pid === undefined || pid === "") return "N/A";

    const byId = productNameMap.get(String(pid));
    if (byId) return byId;

    const pidText = String(pid);
    const looksLikeName = (productsData || []).some((p) => p.name === pidText);
    if (looksLikeName) return pidText;

    return "N/A";
  };

  // ✅ Query args
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: productName || undefined, // ✅ backend filter by name
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [currentPage, itemsPerPage, startDate, endDate, productName]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllPurchaseRequisitionQuery(queryArgs);

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

  // ✅ Modals
  const handleAddProduct = () => {
    setCreateProduct(initialCreateProduct);
    setCreateProductItems([]);
    setIsModalOpen1(true);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    resetBulkAddProduct();
  };
  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setCreateProduct(initialCreateProduct);
    setCreateProductItems([]);
  };
  const handleModalClose2 = () => setIsModalOpen2(false);

  useEffect(() => {
    if (createProduct.paymentMode !== "Bank") {
      if (createProduct.bankName || createProduct.bankAccount) {
        setCreateProduct((p) => ({ ...p, bankName: "", bankAccount: "" }));
      }
    }
  }, [createProduct.paymentMode]);

  useEffect(() => {
    if (!currentProduct) return;
    if (currentProduct.paymentMode !== "Bank") {
      if (currentProduct.bankName || currentProduct.bankAccount) {
        setCurrentProduct((p) => ({ ...p, bankName: "", bankAccount: "" }));
      }
    }
  }, [currentProduct?.paymentMode]);

  const currentProductBulkItems = useMemo(
    () => parsePurchaseRequisitionItems(currentProduct?.items),
    [currentProduct?.items],
  );
  const isEditingBulkPurchaseRequisition = currentProductBulkItems.length > 0;
  const currentProductBulkTotalQuantity = useMemo(
    () => getPurchaseRequisitionItemsTotalQuantity(currentProductBulkItems),
    [currentProductBulkItems],
  );
  const currentProductBulkTotalAmount = useMemo(
    () => getPurchaseRequisitionItemsTotalAmount(currentProductBulkItems),
    [currentProductBulkItems],
  );

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
        quantity: String(getVariantRowsTotalQuantity(nextRows)),
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
      quantity: String(getVariantRowsTotalQuantity(prev?.variantRows)),
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
        quantity: String(
          getVariantRowsTotalQuantity(
            nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
          ),
        ),
      };
    });
  };

  const [updatePurchaseRequisition] = useUpdatePurchaseRequisitionMutation();

  // const handleEditClick = (rp) => {
  //   setCurrentProduct({
  //     ...rp,
  //     productId: rp.productId ? String(rp.productId) : "",
  //     quantity: rp.quantity ?? "",
  //     supplier: rp.supplier ?? "",
  //     note: rp.note ?? "",
  //     date: rp.date ?? "",
  //     userId,
  //   });
  //   setIsModalOpen(true);
  // };

  const handleEditClick = (rp) => {
    const bulkItems = parsePurchaseRequisitionItems(rp.items);
    const firstBulkItem = bulkItems[0] || null;
    const productName =
      firstBulkItem?.name || rp.name || rp.product?.name || "";
    const pidFromRow =
      firstBulkItem?.productId ??
      rp.productId ??
      rp.product?.Id ??
      rp.product?.id ??
      "";
    const pidFromName =
      productIdByNameMap.get(
        String(productName || "")
          .trim()
          .toLowerCase(),
      ) || "";
    const variantRows = getInitialVariantRowsFromRecord(firstBulkItem || rp);
    const supplierId =
      rp.supplierId ?? rp.supplier?.Id ?? rp.supplier?.id ?? "";
    const warehouseId =
      rp.warehouseId ?? rp.warehouse?.Id ?? rp.warehouse?.id ?? "";
    const resolvedProductId = String(pidFromRow || pidFromName);
    const editItems =
      bulkItems.length > 0
        ? bulkItems
        : [
            {
              productId: Number(resolvedProductId) || "",
              name:
                productName ||
                rp.name ||
                `Product #${resolvedProductId || "-"}`,
              quantity:
                getVariantRowsTotalQuantity(variantRows) ||
                Number(rp.quantity) ||
                0,
              amount: Number(rp.amount) || 0,
              variants: getVariantDisplayRows(rp),
            },
          ];

    setCurrentProduct({
      ...rp,
      items: editItems,
      bookId: String(rp.bookId ?? rp.book?.Id ?? rp.book?.id ?? ""),
      paymentMode: rp.paymentMode ?? "",
      bankName: rp.bankName ?? "",
      bankAccount: rp.bankAccount ?? "",
      productId: resolvedProductId, // ✅ selected ঠিক রাখে
      supplierId: String(supplierId),
      warehouseId: String(warehouseId),
      name: productName || rp.name || "",
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
      amount:
        rp.amount !== undefined && rp.amount !== null ? String(rp.amount) : "",
      supplier: rp.supplier ?? "",
      note: rp.note ?? rp.remarks ?? "",
      date: toDateInputValue(rp.date),
      userId,
    });

    setIsModalOpen(true);
    resetBulkAddProduct();
  };

  // const handleEditClick1 = (rp) => {
  //   setCurrentProduct({
  //     ...rp,
  //     productId: rp.productId ? String(rp.productId) : "",
  //     quantity: rp.quantity ?? "",
  //     supplier: rp.supplier ?? "",
  //     note: rp.note ?? "",
  //     userId,
  //   });
  //   setIsModalOpen2(true);
  // };

  const handleEditClick1 = (rp) => {
    const bulkItems = parsePurchaseRequisitionItems(rp.items);
    const firstBulkItem = bulkItems[0] || null;
    const productName =
      firstBulkItem?.name || rp.name || rp.product?.name || "";
    const pidFromRow =
      firstBulkItem?.productId ??
      rp.productId ??
      rp.product?.Id ??
      rp.product?.id ??
      "";
    const pidFromName =
      productIdByNameMap.get(
        String(productName || "")
          .trim()
          .toLowerCase(),
      ) || "";
    const variantRows = getInitialVariantRowsFromRecord(firstBulkItem || rp);
    const supplierId =
      rp.supplierId ?? rp.supplier?.Id ?? rp.supplier?.id ?? "";
    const warehouseId =
      rp.warehouseId ?? rp.warehouse?.Id ?? rp.warehouse?.id ?? "";

    setCurrentProduct({
      ...rp,
      items: bulkItems,
      bookId: String(rp.bookId ?? rp.book?.Id ?? rp.book?.id ?? ""),
      paymentMode: rp.paymentMode ?? "",
      bankName: rp.bankName ?? "",
      bankAccount: rp.bankAccount ?? "",
      productId: String(pidFromRow || pidFromName),
      supplierId: String(supplierId),
      warehouseId: String(warehouseId),
      name: productName || rp.name || "",
      variantRows,
      quantity: String(
        getVariantRowsTotalQuantity(variantRows) || Number(rp.quantity) || 0,
      ),
      amount:
        rp.amount !== undefined && rp.amount !== null ? String(rp.amount) : "",
      supplier: rp.supplier ?? "",
      note: rp.note ?? rp.remarks ?? "",
      date: toDateInputValue(rp.date),
      userId,
    });

    setIsModalOpen2(true);
  };

  const handleUpdateProduct = async () => {
    try {
      const bulkItems = parsePurchaseRequisitionItems(currentProduct?.items);
      const variantsPayload = getNormalizedVariantsPayload(
        currentProduct?.variantRows,
      );
      if (
        !bulkItems.length &&
        hasDuplicateVariantCombination(variantsPayload)
      ) {
        return toast.error("Duplicate size and color combination found");
      }
      if (bulkItems.some((item) => Number(item.quantity) <= 0)) {
        return toast.error("Please enter quantity for every product");
      }
      if (
        currentProduct?.paymentMode === "Bank" &&
        (!currentProduct?.bankName || !currentProduct?.bankAccount)
      ) {
        return toast.error("Please select bank name and bank account");
      }

      const formData = new FormData();
      if (bulkItems.length > 0) {
        formData.append("items", JSON.stringify(bulkItems));
      } else {
        formData.append("productId", Number(currentProduct.productId));
        formData.append("quantity", Number(currentProduct.quantity));
        formData.append("amount", Number(currentProduct.amount) || 0);
        formData.append("variants", JSON.stringify(variantsPayload));
      }
      if (Number(currentProduct.bookId))
        formData.append("bookId", Number(currentProduct.bookId));
      formData.append("paymentMode", currentProduct.paymentMode || "");
      formData.append(
        "bankName",
        currentProduct.paymentMode === "Bank"
          ? currentProduct.bankName || ""
          : "",
      );
      formData.append(
        "bankAccount",
        currentProduct.paymentMode === "Bank"
          ? currentProduct.bankAccount || ""
          : "",
      );
      if (Number(currentProduct.supplierId))
        formData.append("supplierId", Number(currentProduct.supplierId));
      if (Number(currentProduct.warehouseId))
        formData.append("warehouseId", Number(currentProduct.warehouseId));
      formData.append("note", currentProduct.note || "");
      formData.append("status", currentProduct.status || "");
      formData.append("date", currentProduct.date || "");
      formData.append("userId", userId);
      formData.append("actorRole", role);
      if (currentProduct.file) formData.append("file", currentProduct.file);

      const res = await updatePurchaseRequisition({
        id: currentProduct.Id,
        data: formData,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated!");
        setIsModalOpen(false);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (
      !canUpdatePurchaseRequisitionStatus &&
      (currentProduct?.note === "" || currentProduct?.note === null)
    )
      return toast.error("Note is required!");

    try {
      const bulkItems = parsePurchaseRequisitionItems(currentProduct?.items);
      const variantsPayload = getNormalizedVariantsPayload(
        currentProduct?.variantRows,
      );
      if (
        !bulkItems.length &&
        hasDuplicateVariantCombination(variantsPayload)
      ) {
        return toast.error("Duplicate size and color combination found");
      }
      if (
        currentProduct?.paymentMode === "Bank" &&
        (!currentProduct?.bankName || !currentProduct?.bankAccount)
      ) {
        return toast.error("Please select bank name and bank account");
      }

      const formData = new FormData();
      if (bulkItems.length > 0) {
        formData.append("items", JSON.stringify(bulkItems));
      } else {
        formData.append("productId", Number(currentProduct.productId));
        formData.append("quantity", Number(currentProduct.quantity));
        formData.append("amount", Number(currentProduct.amount) || 0);
        formData.append("variants", JSON.stringify(variantsPayload));
      }
      if (Number(currentProduct.bookId))
        formData.append("bookId", Number(currentProduct.bookId));
      formData.append("paymentMode", currentProduct.paymentMode || "");
      formData.append(
        "bankName",
        currentProduct.paymentMode === "Bank"
          ? currentProduct.bankName || ""
          : "",
      );
      formData.append(
        "bankAccount",
        currentProduct.paymentMode === "Bank"
          ? currentProduct.bankAccount || ""
          : "",
      );
      formData.append("status", currentProduct.status || "");
      formData.append("note", currentProduct.note || "");
      formData.append("date", currentProduct.date || "");
      if (Number(currentProduct.supplierId))
        formData.append("supplierId", Number(currentProduct.supplierId));
      if (Number(currentProduct.warehouseId))
        formData.append("warehouseId", Number(currentProduct.warehouseId));
      formData.append("userId", userId);
      formData.append("actorRole", role);
      if (currentProduct.file) formData.append("file", currentProduct.file);

      const res = await updatePurchaseRequisition({
        id: currentProduct.Id,
        data: formData,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen2(false);
        refetch?.();
      } else toast.error(res?.message || "Update failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // ✅ Insert
  const [insertPurchaseRequisition] = useInsertPurchaseRequisitionMutation();

  const resetCreateProductFields = () => {
    setCreateProduct((prev) => ({
      ...prev,
      productId: "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
      amount: "",
    }));
  };

  useEffect(() => {
    if (
      !createProduct.productId ||
      !selectedCreateProductData ||
      !isSelectedCreateProductDataCurrent ||
      shouldShowCreateVariantOptions
    ) {
      return;
    }

    const productId = String(createProduct.productId);
    const label =
      productNameMap.get(productId) ||
      selectedCreateProductData?.name ||
      `Product #${productId}`;

    setCreateProductItems((prev) => [
      ...prev,
      {
        label,
        payload: {
          productId: Number(productId) || "",
          quantity: "",
          amount: "",
          variants: [],
        },
      },
    ]);
    resetCreateProductFields();
  }, [
    createProduct.productId,
    selectedCreateProductData,
    isSelectedCreateProductDataCurrent,
    shouldShowCreateVariantOptions,
    productNameMap,
  ]);

  const buildCreateProductPayload = () => {
    if (!createProduct.productId) return { error: "Please select a product" };

    const variantsPayload = getNormalizedVariantsPayload(
      createProduct.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const totalQuantity =
      variantsPayload.length > 0
        ? getVariantRowsTotalQuantity(variantsPayload)
        : Number(createProduct.quantity) || 0;

    if (totalQuantity <= 0) {
      return { error: "Please enter a valid quantity" };
    }

    const productId = String(createProduct.productId);
    const selectedProduct = productDropdownOptions.find(
      (option) => option.value === productId,
    );

    return {
      label:
        selectedProduct?.label ||
        productNameMap.get(productId) ||
        `Product #${productId}`,
      payload: {
        productId: Number(productId) || "",
        quantity: totalQuantity,
        amount: Number(createProduct.amount) || 0,
        variants: variantsPayload,
      },
    };
  };

  const handleAddCreateProductVariants = () => {
    const item = buildCreateProductPayload();
    if (item.error) return toast.error(item.error);
    setCreateProductItems((prev) => [...prev, item]);
    resetCreateProductFields();
  };

  const handleCreateProductSelect = (selected) => {
    if (!selected?.value) return resetCreateProductFields();

    setCreateProduct((prev) => ({
      ...prev,
      productId: selected.value,
      variantRows: [createEmptyVariantRow()],
      quantity: "",
      amount: "",
    }));
  };

  const updateCreateProductItem = (index, key, value) => {
    setCreateProductItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              payload: {
                ...item.payload,
                [key]: value,
              },
            }
          : item,
      ),
    );
  };

  const updateCreateProductItemVariantField = (
    itemIndex,
    variantIndex,
    key,
    value,
  ) => {
    setCreateProductItems((prev) =>
      prev.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) return item;

        const nextVariants = (item.payload?.variants || []).map(
          (variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex
              ? {
                  ...variant,
                  [key]: key === "quantity" ? Number(value) || 0 : value,
                }
              : variant,
        );

        return {
          ...item,
          payload: {
            ...item.payload,
            variants: nextVariants,
            quantity: nextVariants.reduce(
              (total, variant) => total + (Number(variant.quantity) || 0),
              0,
            ),
          },
        };
      }),
    );
  };

  const updateCurrentProductBulkItem = (index, key, value) => {
    setCurrentProduct((prev) => {
      const nextItems = parsePurchaseRequisitionItems(prev?.items).map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [key]: value,
              }
            : item,
      );

      return {
        ...prev,
        items: nextItems,
        quantity: String(getPurchaseRequisitionItemsTotalQuantity(nextItems)),
        amount: String(getPurchaseRequisitionItemsTotalAmount(nextItems)),
      };
    });
  };

  const updateCurrentProductBulkItemVariantField = (
    itemIndex,
    variantIndex,
    key,
    value,
  ) => {
    setCurrentProduct((prev) => {
      const nextItems = parsePurchaseRequisitionItems(prev?.items).map(
        (item, currentItemIndex) => {
          if (currentItemIndex !== itemIndex) return item;

          const nextVariants = (item.variants || []).map(
            (variant, currentVariantIndex) =>
              currentVariantIndex === variantIndex
                ? {
                    ...variant,
                    [key]: key === "quantity" ? Number(value) || 0 : value,
                  }
                : variant,
          );

          return {
            ...item,
            variants: nextVariants,
            quantity: nextVariants.reduce(
              (total, variant) => total + (Number(variant.quantity) || 0),
              0,
            ),
          };
        },
      );

      return {
        ...prev,
        items: nextItems,
        quantity: String(getPurchaseRequisitionItemsTotalQuantity(nextItems)),
        amount: String(getPurchaseRequisitionItemsTotalAmount(nextItems)),
      };
    });
  };

  const resetBulkAddProduct = () => {
    setBulkAddProduct(initialBulkAddProduct);
  };

  const handleBulkAddProductSelect = (selected) => {
    setBulkAddProduct((prev) => ({
      ...prev,
      productId: selected?.value || "",
      variantRows: [createEmptyVariantRow()],
      quantity: "",
      amount: "",
    }));
  };

  const updateBulkAddProductVariantRow = (index, key, value) => {
    setBulkAddProduct((prev) => {
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

  const addBulkAddProductVariantRow = () => {
    setBulkAddProduct((prev) => ({
      ...prev,
      variantRows: [
        ...normalizeVariantRows(prev?.variantRows),
        createEmptyVariantRow(),
      ],
    }));
  };

  const removeBulkAddProductVariantRow = (index) => {
    setBulkAddProduct((prev) => {
      const nextRows = normalizeVariantRows(prev?.variantRows).filter(
        (_, rowIndex) => rowIndex !== index,
      );

      return {
        ...prev,
        variantRows: nextRows.length > 0 ? nextRows : [createEmptyVariantRow()],
        quantity: String(getVariantRowsTotalQuantity(nextRows)),
      };
    });
  };

  const buildBulkAddProductItem = () => {
    if (!bulkAddProduct.productId) return { error: "Please select a product" };

    const variantsPayload = getNormalizedVariantsPayload(
      bulkAddProduct.variantRows,
    );
    if (hasDuplicateVariantCombination(variantsPayload)) {
      return { error: "Duplicate size and color combination found" };
    }

    const totalQuantity =
      variantsPayload.length > 0
        ? getVariantRowsTotalQuantity(variantsPayload)
        : Number(bulkAddProduct.quantity) || 0;
    if (totalQuantity <= 0) return { error: "Please enter valid quantity" };

    const productId = String(bulkAddProduct.productId);
    const selectedProduct = productDropdownOptions.find(
      (option) => option.value === productId,
    );

    return {
      item: {
        productId: Number(productId) || "",
        name:
          selectedProduct?.label ||
          productNameMap.get(productId) ||
          `Product #${productId}`,
        quantity: totalQuantity,
        amount: Number(bulkAddProduct.amount) || 0,
        variants: variantsPayload,
      },
    };
  };

  const handleAddBulkPurchaseRequisitionProduct = () => {
    const result = buildBulkAddProductItem();
    if (result.error) return toast.error(result.error);

    setCurrentProduct((prev) => {
      const currentItems = parsePurchaseRequisitionItems(prev?.items);
      const existingIndex = currentItems.findIndex(
        (item) => String(item.productId) === String(result.item.productId),
      );

      if (existingIndex !== -1) {
        const existingItem = currentItems[existingIndex];
        const existingVariants = normalizeVariantRows(
          existingItem.variants,
        ).filter(
          (variant) => variant.size || variant.color || variant.quantity,
        );
        const incomingVariants = normalizeVariantRows(
          result.item.variants,
        ).filter(
          (variant) => variant.size || variant.color || variant.quantity,
        );

        if (!incomingVariants.length || !existingVariants.length) {
          toast.error("This product already exists in the list");
          return prev;
        }

        const duplicateVariant = incomingVariants.find((incoming) =>
          existingVariants.some(
            (existing) =>
              String(existing.size || "") === String(incoming.size || "") &&
              String(existing.color || "") === String(incoming.color || ""),
          ),
        );
        if (duplicateVariant) {
          toast.error("This variant already exists in the list");
          return prev;
        }

        const mergedVariants = [...existingVariants, ...incomingVariants];
        const nextItems = currentItems.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                variants: mergedVariants,
                quantity: getVariantRowsTotalQuantity(mergedVariants),
                amount:
                  (Number(item.amount) || 0) +
                  (Number(result.item.amount) || 0),
              }
            : item,
        );

        return {
          ...prev,
          items: nextItems,
          quantity: String(getPurchaseRequisitionItemsTotalQuantity(nextItems)),
          amount: String(getPurchaseRequisitionItemsTotalAmount(nextItems)),
        };
      }

      const nextItems = [...currentItems, result.item];
      return {
        ...prev,
        items: nextItems,
        quantity: String(getPurchaseRequisitionItemsTotalQuantity(nextItems)),
        amount: String(getPurchaseRequisitionItemsTotalAmount(nextItems)),
      };
    });
    resetBulkAddProduct();
  };

  const createProductItemsTotalQuantity = useMemo(() => {
    const savedTotal = createProductItems.reduce(
      (total, item) => total + (Number(item.payload?.quantity) || 0),
      0,
    );
    const currentTotal =
      createProduct.productId && createProduct.quantity
        ? Number(createProduct.quantity) || 0
        : 0;

    return savedTotal + currentTotal;
  }, [createProductItems, createProduct.productId, createProduct.quantity]);

  const createProductItemsTotalAmount = useMemo(() => {
    const savedTotal = createProductItems.reduce(
      (total, item) => total + (Number(item.payload?.amount) || 0),
      0,
    );
    const currentTotal =
      createProduct.productId && createProduct.amount
        ? Number(createProduct.amount) || 0
        : 0;

    return savedTotal + currentTotal;
  }, [createProductItems, createProduct.productId, createProduct.amount]);

  const appendPurchaseRequisitionPayload = (formData, payload) => {
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, key === "variants" ? JSON.stringify(value) : value);
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    try {
      if (
        createProduct.paymentMode === "Bank" &&
        (!createProduct.bankName || !createProduct.bankAccount)
      ) {
        return toast.error("Please select bank name and bank account");
      }

      const commonFields = {
        procurement:
          `${user?.FirstName || ""} ${user?.LastName || ""}`.trim() || "N/A",
        bookId: Number(createProduct.bookId) || "",
        paymentMode: createProduct.paymentMode || "",
        bankName:
          createProduct.paymentMode === "Bank"
            ? createProduct.bankName || ""
            : "",
        bankAccount:
          createProduct.paymentMode === "Bank"
            ? createProduct.bankAccount || ""
            : "",
        supplierId: Number(createProduct.supplierId) || "",
        warehouseId: Number(createProduct.warehouseId) || "",
        note: createProduct.note || "",
        date: createProduct.date,
        userId,
      };

      let items = createProductItems.map((item) => ({
        ...item.payload,
        ...commonFields,
      }));

      if (createProduct.productId) {
        const item = buildCreateProductPayload();
        if (item.error) return toast.error(item.error);
        items = [
          ...items,
          {
            ...item.payload,
            ...commonFields,
          },
        ];
      }

      if (items.length === 0) {
        return toast.error("Please add at least one product");
      }

      if (items.some((item) => Number(item.quantity) <= 0)) {
        return toast.error("Please enter quantity for every product");
      }

      const formData = new FormData();
      if (items.length === 1) {
        appendPurchaseRequisitionPayload(formData, items[0]);
      } else {
        appendPurchaseRequisitionPayload(formData, commonFields);
        formData.append("items", JSON.stringify(items));
      }
      if (createProduct.file) formData.append("file", createProduct.file);

      const res = await insertPurchaseRequisition(formData).unwrap();
      if (res?.success) {
        toast.success(
          items.length > 1
            ? "Successfully created purchase requisitions"
            : "Successfully created purchase requisition",
        );
        setIsModalOpen1(false);
        setCreateProduct(initialCreateProduct);
        setCreateProductItems([]);
        refetch?.();
      } else toast.error(res?.message || "Create failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // ✅ Delete
  const [deletePurchaseRequisition] = useDeletePurchaseRequisitionMutation();

  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this product?",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deletePurchaseRequisition(id).unwrap();
      if (res?.success !== false) {
        toast.success("Product deleted successfully!");
        refetch?.();
      } else toast.error(res?.message || "Delete failed!");
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // ✅ Filters clear
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProductName("");
  };

  // ✅ react-select light styles (so it looks good in light UI)
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 14,
      borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0", // indigo-200 / slate-200
      boxShadow: state.isFocused ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0 12px" }),
    placeholder: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: "hidden",
      zIndex: 10050,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 10050 }),
  };

  const selectPortalTarget =
    typeof document !== "undefined" ? document.body : null;

  // ✅ suppliers
  const {
    data: allSupplierRes,
    isError: isErrorSupplier,
    error: errorSupplier,
  } = useGetAllSupplierWithoutQueryQuery();
  const suppliers = useMemo(() => allSupplierRes?.data || [], [allSupplierRes]);

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
    isError: isErrorWarehouse,
    error: errorWarehouse,
  } = useGetAllWirehouseWithoutQueryQuery();
  const warehouses = useMemo(
    () => allWarehousesRes?.data || [],
    [allWarehousesRes],
  );

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

  // ✅ books
  const {
    data: allBooksRes,
    isError: isErrorBook,
    error: errorBook,
  } = useGetAllBookWithoutQueryQuery();
  const books = useMemo(() => allBooksRes?.data || [], [allBooksRes]);

  useEffect(() => {
    if (isErrorBook) console.error("Error fetching books", errorBook);
  }, [isErrorBook, errorBook]);

  const bookOptions = useMemo(
    () =>
      (books || []).map((b) => ({
        value: b.Id,
        label: b.name,
      })),
    [books],
  );

  const paymentModeOptions = useMemo(
    () =>
      ["Cash", "Bkash", "Nagad", "Rocket", "Bank", "Card"].map((mode) => ({
        value: mode,
        label: mode,
      })),
    [],
  );

  const { data: bankAccountRes } = useGetAllBankAccountWithoutQueryQuery();
  const bankAccountsFromDB = bankAccountRes?.data || [];

  const bankOptions = useMemo(() => {
    const seen = new Set();
    return bankAccountsFromDB
      .filter((ba) => {
        const key = String(ba.bankName || "")
          .toLowerCase()
          .trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((ba) => ({ value: ba.bankName, label: ba.bankName }));
  }, [bankAccountsFromDB]);

  const getBankAccountOptions = (bankName = "") =>
    bankAccountsFromDB
      .filter(
        (ba) =>
          !bankName || String(ba.bankName || "") === String(bankName || ""),
      )
      .map((ba) => ({
        value: ba.accountNumber,
        label: `${ba.accountNumber} (${ba.bankName})`,
        bankName: ba.bankName,
      }));

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  // ✅ Invoice state & refs
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const invoiceRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    contentRef: invoiceRef,
    documentTitle: invoiceData?.invoiceNo
      ? String(invoiceData.invoiceNo)
      : "purchase-requisition-invoice",
    removeAfterPrint: true,
  });

  const handleDownloadPdf = async () => {
    try {
      if (!invoiceRef.current) return;

      const el = invoiceRef.current;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = invoiceData?.invoiceNo
        ? `${invoiceData.invoiceNo}.pdf`
        : `purchase-requisition-${Date.now()}.pdf`;

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download failed:", e);
      toast.error("PDF generate করতে সমস্যা হচ্ছে।");
    }
  };

  const handleInvoiceClick = (rp) => {
    const invoiceNo = `PRQ-${rp.Id}-${String(Date.now()).slice(-6)}`;
    const variantDisplayRows = getVariantDisplayRows(rp);

    const invoice = {
      invoiceNo,
      date: rp.date || new Date().toISOString().slice(0, 10),
      procurement: rp?.procurement || "N/A",
      supplier: rp?.supplier?.name || "N/A",
      warehouse: rp?.warehouse?.name || "N/A",
      product: rp.name || resolveProductName(rp),
      quantity: Number(rp.quantity || 0),
      amount: Number(rp.amount || 0),
      variants: variantDisplayRows,
      note: rp.note || "—",
      status: rp.status,
    };

    setInvoiceData(invoice);
    setInvoiceOpen(true);
  };

  return (
    <motion.div
      className="bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Top Bar */}
      <div className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleAddProduct}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add <Plus size={18} className="ml-2" />
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <ShoppingBasket size={18} className="text-amber-500" />
            <span className="text-sm">Total Purchase</span>
          </div>

          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalQuantity ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end w-full">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          compact
          className="md:col-span-2"
        />

        {/* ✅ Per Page Dropdown (same position like your screenshot) */}
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

        {/* Product Filter (stores NAME) */}
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Product</label>
          <Select
            options={productDropdownOptions}
            value={
              productDropdownOptions.find((o) => o.label === productName) ||
              null
            }
            onChange={(selected) => setProductName(selected?.label || "")}
            placeholder={isLoadingAllProducts ? "Loading..." : "Select Product"}
            isClearable
            className="text-black"
            isDisabled={isLoadingAllProducts}
            styles={selectStyles}
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
            styles={selectStyles}
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
            styles={selectStyles}
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
      <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden">
        <div className="four-row-table-scroll custom-scrollbar">
          <table className="min-w-[1100px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Procurement
                </th>{" "}
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Supplier
                </th>{" "}
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Book
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Variants
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
                const rowItems = getPurchaseRequisitionRowItems(rp);
                const rowTotalQuantity =
                  getPurchaseRequisitionItemsTotalQuantity(rowItems);
                const rowTotalAmount =
                  getPurchaseRequisitionItemsTotalAmount(rowItems);

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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {rp?.procurement || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {rp?.supplier?.name || "-"}
                    </td>{" "}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {rp?.warehouse?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {rp?.book?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {rowItems
                        .map(
                          (item) =>
                            item.name || `Product #${item.productId || "-"}`,
                        )
                        .filter(Boolean)
                        .join(", ") ||
                        rp.name ||
                        resolveProductName(rp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {Number(rowTotalQuantity || rp.quantity || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {Number(rowTotalAmount || rp.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 min-w-[340px]">
                      {rowItems.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {rowItems.map((item, itemIndex) => {
                            const itemVariants = getVariantDisplayRows(item);
                            if (itemVariants.length === 0) {
                              return (
                                <div
                                  key={`${rp.Id}-no-variant-${itemIndex}`}
                                  className="w-fit min-w-[132px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 shadow-sm"
                                >
                                  <div className="text-[11px] font-bold text-slate-700">
                                    {item.name ||
                                      `Product #${item.productId || "-"}`}
                                  </div>
                                  <div className="mt-2 text-[11px] font-medium text-slate-500">
                                    Qty{" "}
                                    <span className="font-bold text-slate-900">
                                      {Number(item.quantity || 0).toFixed(0)}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-[10px] font-semibold text-slate-400">
                                    No variants
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={`${rp.Id}-variant-item-${itemIndex}`}
                                className="flex flex-wrap gap-2"
                              >
                                {itemVariants.map((variant, index) => (
                                  <div
                                    key={`${rp.Id}-variant-${itemIndex}-${index}`}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
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
                                        {Number(variant.quantity || 0).toFixed(
                                          0,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-400">
                          No variants
                        </span>
                      )}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(rp.sale_price || 0).toFixed(2)}
                </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${getPurchaseRequisitionStatusClass(
                          rp.status,
                        )}`}
                      >
                        {rp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {rp.status === "Approved" && (
                          <button
                            type="button"
                            onClick={() => handleInvoiceClick(rp)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                            title="Print Invoice"
                          >
                            <Printer size={18} className="text-emerald-600" />
                          </button>
                        )}

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
                          type="button"
                          onClick={() => handleEditClick(rp)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                          title="Edit"
                        >
                          <Edit size={18} className="text-indigo-600" />
                        </button>

                        {role === "superAdmin" || role === "admin" ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(rp.Id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEditClick1(rp)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-white transition"
                            title="Request Delete"
                          >
                            <Trash2 size={18} className="text-amber-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && !!currentProduct}
        onClose={handleModalClose}
        title="Edit Purchase Requisition"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {isEditingBulkPurchaseRequisition && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Line Items
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Quantity
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {currentProductBulkTotalQuantity}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-white px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Amount
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {Number(currentProductBulkTotalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-3 text-left">Product</th>
                      <th className="px-3 py-3 text-left">Product Detail</th>
                      <th className="px-3 py-3 text-left">Variant Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentProductBulkItems.map((item, index) => (
                      <tr
                        key={`edit-bulk-${item.productId || item.name}-${index}`}
                      >
                        <td className="px-3 py-3 align-top font-semibold text-slate-800">
                          {item.name || `Product #${item.productId || "-"}`}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {item.variants?.length ? "Total Qty" : "Qty"}
                              </p>
                              {item.variants?.length ? (
                                <p className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                                  {Number(item.quantity || 0)}
                                </p>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.quantity ?? ""}
                                    onChange={(e) =>
                                      updateCurrentProductBulkItem(
                                        index,
                                        "quantity",
                                        e.target.value,
                                      )
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                  />
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    Stock:{" "}
                                    {getInventoryQuantityForProduct(
                                      item.productId,
                                      item.name,
                                    )}
                                  </p>
                                </>
                              )}
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Amount
                              </p>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.amount ?? ""}
                                onChange={(e) =>
                                  updateCurrentProductBulkItem(
                                    index,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500">
                          {item.variants?.length
                            ? item.variants.map((variant, variantIndex) => (
                                <div
                                  key={`${variant.size}-${variant.color}-${variantIndex}`}
                                  className="mb-2 grid grid-cols-[1fr_90px] items-end gap-2 last:mb-0"
                                >
                                  <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                    {variant.size || "-"} /{" "}
                                    {variant.color || "-"}
                                  </span>
                                  <div>
                                    {variantIndex === 0 && (
                                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                        Qty
                                      </p>
                                    )}
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={variant.quantity}
                                      onChange={(e) =>
                                        updateCurrentProductBulkItemVariantField(
                                          index,
                                          variantIndex,
                                          "quantity",
                                          e.target.value,
                                        )
                                      }
                                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      Stock:{" "}
                                      {getInventoryQuantityForVariant(
                                        item.productId,
                                        variant,
                                        item.name,
                                      ) ?? 0}
                                    </p>
                                  </div>
                                </div>
                              ))
                            : "No variants"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                  <div>
                    <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      New Product
                    </label>
                    <Select
                      options={productDropdownOptions}
                      value={makeSelectValue(
                        productDropdownOptions,
                        bulkAddProduct.productId,
                      )}
                      onChange={handleBulkAddProductSelect}
                      placeholder="Select Product"
                      isClearable
                      styles={selectStyles}
                      className="text-sm font-medium text-black"
                      isDisabled={isLoadingAllProducts}
                    />
                  </div>

                  {!shouldShowBulkAddVariantOptions && (
                    <div className="lg:w-36">
                      <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bulkAddProduct.quantity}
                        onChange={(e) =>
                          setBulkAddProduct((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        disabled={!bulkAddProduct.productId}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      {bulkAddProduct.productId && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Stock:{" "}
                          {getInventoryQuantityForProduct(
                            bulkAddProduct.productId,
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="lg:w-36">
                    <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkAddProduct.amount}
                      onChange={(e) =>
                        setBulkAddProduct((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      disabled={!bulkAddProduct.productId}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBulkPurchaseRequisitionProduct}
                    disabled={
                      !bulkAddProduct.productId || isFetchingBulkAddProduct
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Add Product
                  </button>
                </div>

                {bulkAddProduct.productId &&
                  shouldShowBulkAddVariantOptions && (
                    <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={addBulkAddProductVariantRow}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Plus size={14} />
                          Add Variant
                        </button>
                      </div>

                      {normalizeVariantRows(bulkAddProduct.variantRows).map(
                        (row, index) => {
                          const colorOptions = row.size
                            ? getVariationColorsForSize(
                                selectedBulkAddProductData,
                                row.size,
                              )
                            : bulkAddColorOptions;

                          return (
                            <div
                              key={`bulk-purchase-requisition-add-variant-${index}`}
                              className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end"
                            >
                              <Select
                                options={bulkAddSizeOptions}
                                value={makeSelectValue(
                                  bulkAddSizeOptions,
                                  row.size,
                                  row.size,
                                )}
                                onChange={(selected) =>
                                  updateBulkAddProductVariantRow(
                                    index,
                                    "size",
                                    selected?.value || "",
                                  )
                                }
                                placeholder="Select size..."
                                isClearable
                                styles={selectStyles}
                                className="text-sm font-medium"
                              />
                              <Select
                                options={colorOptions}
                                value={makeSelectValue(
                                  colorOptions,
                                  row.color,
                                  row.color,
                                )}
                                onChange={(selected) =>
                                  updateBulkAddProductVariantRow(
                                    index,
                                    "color",
                                    selected?.value || "",
                                  )
                                }
                                placeholder="Select color..."
                                isClearable
                                styles={selectStyles}
                                className="text-sm font-medium"
                                isDisabled={!row.size}
                              />
                              <div>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    updateBulkAddProductVariantRow(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                  placeholder="Qty"
                                />
                                {(row.size || row.color) && (
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    Stock:{" "}
                                    {getInventoryQuantityForVariant(
                                      bulkAddProduct.productId,
                                      row,
                                    ) ?? 0}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  removeBulkAddProductVariantRow(index)
                                }
                                disabled={
                                  normalizeVariantRows(
                                    bulkAddProduct.variantRows,
                                  ).length === 1
                                }
                                className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              >
                                x
                              </button>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={
                isEditingBulkPurchaseRequisition ? "hidden" : "md:col-span-2"
              }
            >
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Product
              </label>
              <Select
                options={productDropdownOptions}
                value={makeSelectValue(
                  productDropdownOptions,
                  currentProduct?.productId,
                  currentProduct?.name || currentProduct?.product?.name,
                )}
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    productId: selected?.value || "",
                    variantRows: [createEmptyVariantRow()],
                    quantity: "",
                  })
                }
                placeholder="Select Product"
                isClearable
                styles={selectStyles}
                className="text-black"
                isDisabled={isLoadingAllProducts}
              />
            </div>

            {!isEditingBulkPurchaseRequisition &&
              shouldShowEditVariantOptions && (
                <div className="md:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Product Variants
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Add size, color and quantity combinations
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addVariantRow("edit")}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                      disabled={!currentProduct?.productId}
                    >
                      <Plus size={14} />
                      Add Variant
                    </button>
                  </div>

                  {normalizeVariantRows(currentProduct?.variantRows).map(
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                              Size / Code
                            </label>
                            <Select
                              options={editSizeOptions}
                              value={makeSelectValue(
                                editSizeOptions,
                                row.size,
                                row.size,
                              )}
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
                              className="text-black"
                              isDisabled={
                                !currentProduct?.productId ||
                                editSizeOptions.length === 0
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                              Color
                            </label>
                            <Select
                              options={colorOptions}
                              value={makeSelectValue(
                                colorOptions,
                                row.color,
                                row.color,
                              )}
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
                              className="text-black"
                              isDisabled={
                                !row.size || colorOptions.length === 0
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
                                !currentProduct?.productId ||
                                editSizeOptions.length === 0
                              }
                              className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                              placeholder=""
                            />
                            {(row.size || row.color) && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                Stock:{" "}
                                {getInventoryQuantityForVariant(
                                  currentProduct?.productId,
                                  row,
                                  currentProduct?.name,
                                ) ?? 0}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeVariantRow("edit", index)}
                            className="h-12 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                            disabled={
                              normalizeVariantRows(currentProduct?.variantRows)
                                .length === 1
                            }
                          >
                            <X size={16} className="mx-auto" />
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Warehouse
              </label>
              <Select
                options={warehouseOptions}
                value={makeSelectValue(
                  warehouseOptions,
                  currentProduct?.warehouseId,
                  currentProduct?.warehouse?.name,
                )}
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    warehouseId: selected?.value || "",
                  })
                }
                placeholder="Select Warehouse"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Supplier
              </label>
              <Select
                options={supplierOptions}
                value={makeSelectValue(
                  supplierOptions,
                  currentProduct?.supplierId,
                  currentProduct?.supplier?.name,
                )}
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    supplierId: selected?.value || "",
                  })
                }
                placeholder="Select Supplier"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Book
              </label>
              <Select
                options={bookOptions}
                value={makeSelectValue(
                  bookOptions,
                  currentProduct?.bookId,
                  currentProduct?.book?.name || currentProduct?.book?.title,
                )}
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    bookId: selected?.value || "",
                  })
                }
                placeholder="Select Book"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={makeSelectValue(
                  paymentModeOptions,
                  currentProduct?.paymentMode,
                  currentProduct?.paymentMode,
                )}
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    paymentMode: selected?.value || "",
                    bankName: "",
                    bankAccount: "",
                  })
                }
                placeholder="Select Payment Mode"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            {currentProduct?.paymentMode === "Bank" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Bank Name
                  </label>
                  <Select
                    options={bankOptions}
                    value={makeSelectValue(
                      bankOptions,
                      currentProduct?.bankName,
                      currentProduct?.bankName,
                    )}
                    onChange={(selected) =>
                      setCurrentProduct({
                        ...currentProduct,
                        bankName: selected?.value || "",
                        bankAccount: "",
                      })
                    }
                    placeholder="Select Bank"
                    isClearable
                    className="text-black"
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Bank Account
                  </label>
                  <Select
                    options={getBankAccountOptions(currentProduct?.bankName)}
                    value={makeSelectValue(
                      getBankAccountOptions(currentProduct?.bankName),
                      currentProduct?.bankAccount,
                      currentProduct?.bankAccount,
                    )}
                    onChange={(selected) =>
                      setCurrentProduct({
                        ...currentProduct,
                        bankAccount: selected?.value || "",
                        bankName:
                          selected?.bankName || currentProduct.bankName || "",
                      })
                    }
                    placeholder="Select Bank Account"
                    isClearable
                    className="text-black"
                    styles={selectStyles}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Date
              </label>
              <input
                type="date"
                value={currentProduct?.date || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, date: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>
            {!isEditingBulkPurchaseRequisition && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentProduct?.quantity || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({
                      ...p,
                      quantity: e.target.value,
                    }))
                  }
                  readOnly={hasConfiguredVariants(currentProduct?.variantRows)}
                  className={`w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 outline-none ${
                    hasConfiguredVariants(currentProduct?.variantRows)
                      ? "bg-slate-50"
                      : "bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  }`}
                />
                {!hasConfiguredVariants(currentProduct?.variantRows) && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Stock:{" "}
                    {getInventoryQuantityForProduct(
                      currentProduct?.productId,
                      currentProduct?.name,
                    )}
                  </p>
                )}
              </div>
            )}
            {!isEditingBulkPurchaseRequisition && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentProduct?.amount || ""}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({ ...p, amount: e.target.value }))
                  }
                  className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {canUpdatePurchaseRequisitionStatus ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Status
              </label>
              <Select
                options={purchaseRequisitionStatuses.map((status) => ({
                  value: status,
                  label: status,
                }))}
                menuPortalTarget={selectPortalTarget}
                menuPosition="fixed"
                value={
                  currentProduct?.status
                    ? {
                        value: currentProduct.status,
                        label: currentProduct.status,
                      }
                    : null
                }
                onChange={(selected) =>
                  setCurrentProduct({
                    ...currentProduct,
                    status: selected?.value || "",
                  })
                }
                placeholder="Select Status"
                className="text-black"
                styles={selectStyles}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Note
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={3}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.document || "Document"}
            </label>
            <div className="relative group/file">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    file: e.target.files?.[0] || null,
                  })
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full h-12 border-2 border-dashed border-slate-200 rounded-xl flex items-center px-4 gap-3 bg-slate-50 group-hover/file:border-indigo-400 group-hover/file:bg-indigo-50 transition">
                <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover/file:text-indigo-600 transition">
                  <Plus size={16} />
                </div>
                <span className="text-sm font-medium text-slate-500 group-hover/file:text-indigo-600">
                  {currentProduct?.file
                    ? currentProduct?.file.name
                    : t.select_drop_file || "Select or drop file..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add Purchase Requisition"
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={handleCreateProduct}
          className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Product
              </label>
              <Select
                options={productDropdownOptions}
                value={
                  productDropdownOptions.find(
                    (o) => o.value === String(createProduct.productId),
                  ) || null
                }
                onChange={handleCreateProductSelect}
                placeholder="Select Product"
                isClearable
                className="text-black"
                styles={selectStyles}
                isDisabled={isLoadingAllProducts}
              />
            </div>

            {shouldShowCreateVariantOptions && (
              <div className="md:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Product Variants
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Add size, color and quantity combinations
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addVariantRow("create")}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition"
                    disabled={!createProduct?.productId}
                  >
                    <Plus size={14} />
                    Add Variant
                  </button>
                </div>

                {normalizeVariantRows(createProduct?.variantRows).map(
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
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                            Size / Code
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
                            className="text-black"
                            isDisabled={
                              !createProduct?.productId ||
                              createSizeOptions.length === 0
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
                            className="text-black"
                            isDisabled={!row.size || colorOptions.length === 0}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
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
                              !createProduct?.productId ||
                              createSizeOptions.length === 0
                            }
                            className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder=""
                          />
                          {createProduct?.productId &&
                            row.size &&
                            (() => {
                              const invItem = receivedData.find(
                                (r) =>
                                  Number(r.productId) ===
                                  Number(createProduct.productId),
                              );
                              if (!invItem) return null;
                              const match = getVariantDisplayRows(invItem).find(
                                (v) =>
                                  String(v.size || "") ===
                                    String(row.size || "") &&
                                  String(v.color || "") ===
                                    String(row.color || ""),
                              );
                              return match !== undefined ? (
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Stock: {Number(match.quantity || 0)}
                                </p>
                              ) : null;
                            })()}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeVariantRow("create", index)}
                          className="h-12 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                          disabled={
                            normalizeVariantRows(createProduct?.variantRows)
                              .length === 1
                          }
                        >
                          <X size={16} className="mx-auto" />
                        </button>
                      </div>
                    );
                  },
                )}
                <div className="flex justify-end border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={handleAddCreateProductVariants}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
                  >
                    <Plus size={16} />
                    Add Variants
                  </button>
                </div>
              </div>
            )}

            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Line Items
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Select a product above to add a new row; then set quantity
                    and amount here
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Quantity
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {createProductItemsTotalQuantity || ""}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-white px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Amount
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {createProductItemsTotalAmount
                        ? Number(createProductItemsTotalAmount).toFixed(2)
                        : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-3 text-left">Product</th>
                      <th className="px-3 py-3 text-left">Product Detail</th>
                      <th className="px-3 py-3 text-left">Variant Detail</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createProductItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-8 text-center text-sm text-slate-400"
                        >
                          No products added
                        </td>
                      </tr>
                    ) : (
                      createProductItems.map((item, index) => (
                        <tr key={`${item.label}-${index}`}>
                          <td className="px-3 py-3 align-top font-semibold text-slate-800">
                            {item.label}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {item.payload.variants?.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Quantity
                                  </p>
                                  <p className="text-base font-black text-slate-900">
                                    {blankIfZero(item.payload.quantity)}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Amount
                                  </p>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={blankIfZero(item.payload.amount)}
                                    onChange={(e) =>
                                      updateCreateProductItem(
                                        index,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Qty
                                  </p>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={blankIfZero(item.payload.quantity)}
                                    onChange={(e) =>
                                      updateCreateProductItem(
                                        index,
                                        "quantity",
                                        e.target.value,
                                      )
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                  />
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    Stock:{" "}
                                    {getInventoryQuantityForProduct(
                                      item.payload.productId,
                                      item.label,
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Amount
                                  </p>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={blankIfZero(item.payload.amount)}
                                    onChange={(e) =>
                                      updateCreateProductItem(
                                        index,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-xs text-slate-500">
                            {item.payload.variants?.length
                              ? item.payload.variants.map(
                                  (variant, variantIndex) => (
                                    <div
                                      key={`${variant.size}-${variant.color}-${variantIndex}`}
                                      className="mb-2 grid grid-cols-[1fr_90px] items-end gap-2 last:mb-0"
                                    >
                                      <span className="rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                                        {variant.size || "-"} /{" "}
                                        {variant.color || "-"}
                                      </span>
                                      <div>
                                        {variantIndex === 0 && (
                                          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                            Qty
                                          </p>
                                        )}
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={variant.quantity}
                                          onChange={(e) =>
                                            updateCreateProductItemVariantField(
                                              index,
                                              variantIndex,
                                              "quantity",
                                              e.target.value,
                                            )
                                          }
                                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                                        />
                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                          Stock:{" "}
                                          {getInventoryQuantityForVariant(
                                            item.payload.productId,
                                            variant,
                                            item.label,
                                          ) ?? 0}
                                        </p>
                                      </div>
                                    </div>
                                  ),
                                )
                              : "No variants"}
                          </td>
                          <td className="px-3 py-3 text-right align-top">
                            <button
                              type="button"
                              onClick={() =>
                                setCreateProductItems((prev) =>
                                  prev.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
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

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Date
              </label>
              <input
                type="date"
                value={createProduct.date}
                onChange={(e) =>
                  setCreateProduct({ ...createProduct, date: e.target.value })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Warehouse
              </label>
              <Select
                options={warehouseOptions}
                value={
                  warehouseOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct.warehouseId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    warehouseId: selected?.value || "",
                  })
                }
                placeholder="Select Warehouse"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Supplier
              </label>
              <Select
                options={supplierOptions}
                value={
                  supplierOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct.supplierId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    supplierId: selected?.value || "",
                  })
                }
                placeholder="Select Supplier"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Book
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    bookId: selected?.value || "",
                  })
                }
                placeholder="Select Book"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Payment Mode
              </label>
              <Select
                options={paymentModeOptions}
                value={
                  paymentModeOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createProduct.paymentMode || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateProduct({
                    ...createProduct,
                    paymentMode: selected?.value || "",
                    bankName: "",
                    bankAccount: "",
                  })
                }
                placeholder="Select Payment Mode"
                isClearable
                className="text-black"
                styles={selectStyles}
              />
            </div>
            {createProduct.paymentMode === "Bank" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Bank Name
                  </label>
                  <Select
                    options={bankOptions}
                    value={
                      bankOptions.find(
                        (option) =>
                          String(option.value) ===
                          String(createProduct.bankName || ""),
                      ) || null
                    }
                    onChange={(selected) =>
                      setCreateProduct({
                        ...createProduct,
                        bankName: selected?.value || "",
                        bankAccount: "",
                      })
                    }
                    placeholder="Select Bank"
                    isClearable
                    className="text-black"
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Bank Account
                  </label>
                  <Select
                    options={getBankAccountOptions(createProduct.bankName)}
                    value={
                      getBankAccountOptions(createProduct.bankName).find(
                        (option) =>
                          String(option.value) ===
                          String(createProduct.bankAccount || ""),
                      ) || null
                    }
                    onChange={(selected) =>
                      setCreateProduct({
                        ...createProduct,
                        bankAccount: selected?.value || "",
                        bankName:
                          selected?.bankName || createProduct.bankName || "",
                      })
                    }
                    placeholder="Select Bank Account"
                    isClearable
                    className="text-black"
                    styles={selectStyles}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Note
            </label>
            <textarea
              value={createProduct.note}
              onChange={(e) =>
                setCreateProduct({ ...createProduct, note: e.target.value })
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {t.document || "Document"}
            </label>
            <div className="relative group/file">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) =>
                  setCreateProduct({
                    ...createProduct,
                    file: e.target.files?.[0] || null,
                  })
                }
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full h-12 border-2 border-dashed border-slate-200 rounded-xl flex items-center px-4 gap-3 bg-slate-50 group-hover/file:border-indigo-400 group-hover/file:bg-indigo-50 transition">
                <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover/file:text-indigo-600 transition">
                  <Plus size={16} />
                </div>
                <span className="text-sm font-medium text-slate-500 group-hover/file:text-indigo-600">
                  {createProduct.file
                    ? createProduct.file.name
                    : t.select_drop_file || "Select or drop file..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* Note / Status Modal */}
      <Modal
        isOpen={isModalOpen2 && !!currentProduct}
        onClose={handleModalClose2}
        title={
          canUpdatePurchaseRequisitionStatus
            ? "Update Status"
            : "Request Delete"
        }
      >
        <div className="space-y-6">
          {canUpdatePurchaseRequisitionStatus ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Status
                </label>
                <Select
                  options={purchaseRequisitionStatuses.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                  menuPortalTarget={selectPortalTarget}
                  menuPosition="fixed"
                  value={
                    currentProduct?.status
                      ? {
                          value: currentProduct.status,
                          label: currentProduct.status,
                        }
                      : null
                  }
                  onChange={(selected) =>
                    setCurrentProduct({
                      ...currentProduct,
                      status: selected?.value || "",
                    })
                  }
                  placeholder="Select Status"
                  className="text-black"
                  styles={selectStyles}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Payment Mode
                  </label>
                  <Select
                    options={paymentModeOptions}
                    value={
                      paymentModeOptions.find(
                        (option) =>
                          String(option.value) ===
                          String(currentProduct?.paymentMode || ""),
                      ) || null
                    }
                    onChange={(selected) =>
                      setCurrentProduct({
                        ...currentProduct,
                        paymentMode: selected?.value || "",
                        bankName: "",
                        bankAccount: "",
                      })
                    }
                    placeholder="Select Payment Mode"
                    isClearable
                    className="text-black"
                    styles={selectStyles}
                  />
                </div>
                {currentProduct?.paymentMode === "Bank" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                        Bank Name
                      </label>
                      <Select
                        options={bankOptions}
                        value={
                          bankOptions.find(
                            (option) =>
                              String(option.value) ===
                              String(currentProduct?.bankName || ""),
                          ) || null
                        }
                        onChange={(selected) =>
                          setCurrentProduct({
                            ...currentProduct,
                            bankName: selected?.value || "",
                            bankAccount: "",
                          })
                        }
                        placeholder="Select Bank"
                        isClearable
                        className="text-black"
                        styles={selectStyles}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                        Bank Account
                      </label>
                      <Select
                        options={getBankAccountOptions(
                          currentProduct?.bankName,
                        )}
                        value={
                          getBankAccountOptions(currentProduct?.bankName).find(
                            (option) =>
                              String(option.value) ===
                              String(currentProduct?.bankAccount || ""),
                          ) || null
                        }
                        onChange={(selected) =>
                          setCurrentProduct({
                            ...currentProduct,
                            bankAccount: selected?.value || "",
                            bankName:
                              selected?.bankName ||
                              currentProduct.bankName ||
                              "",
                          })
                        }
                        placeholder="Select Bank Account"
                        isClearable
                        className="text-black"
                        styles={selectStyles}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Reason for Deletion
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={4}
                placeholder="Briefly explain why this requisition should be deleted..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose2}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProduct1}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Confirm Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Note View Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title="Requisition Note"
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleNoteModalClose}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Invoice Modal */}
      <RequisitionInvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        invoice={invoiceData}
        invoiceRef={invoiceRef}
        onPrint={handlePrint}
        onDownload={handleDownloadPdf}
      />
    </motion.div>
  );
};

function RequisitionInvoiceModal({
  open,
  onClose,
  invoice,
  invoiceRef,
  onPrint,
  onDownload,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">
              Purchase Requisition Invoice
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onPrint}
                className="h-10 px-4 rounded-xl bg-black text-white font-semibold hover:bg-black/90"
                type="button"
                disabled={!invoice}
              >
                Print
              </button>

              <button
                type="button"
                onClick={onDownload}
                disabled={!invoice}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-900 font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                Download PDF
              </button>

              <button
                onClick={onClose}
                className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-700"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[75vh] overflow-auto bg-slate-50">
            <div
              ref={invoiceRef}
              className="pdf-safe bg-white rounded-xl p-6 border border-slate-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    PURCHASE REQUISITION
                  </div>

                  <div className="text-sm text-slate-600 mt-1">
                    Invoice No:{" "}
                    <span className="font-semibold text-slate-900">
                      {invoice?.invoiceNo || "N/A"}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600">
                    Date:{" "}
                    <span className="font-semibold text-slate-900">
                      {invoice?.date || "N/A"}
                    </span>
                  </div>
                </div>

                <DocumentBrand subtitle="Purchase Requisition Invoice" />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    Requisition Details
                  </div>
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold">Procurement:</span>{" "}
                    {invoice?.procurement || "N/A"}
                  </div>
                  <div className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Supplier:</span>{" "}
                    {invoice?.supplier || "N/A"}
                  </div>
                  <div className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Warehouse:</span>{" "}
                    {invoice?.warehouse || "N/A"}
                  </div>
                  <div className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Status:</span>{" "}
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {invoice?.status || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    Product Summary
                  </div>

                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Product</span>
                    <span className="font-semibold text-slate-900">
                      {invoice?.product || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Quantity</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.quantity || 0).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Amount</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.amount || 0).toFixed(0)} ৳
                    </span>
                  </div>
                </div>
              </div>

              {/* Variants Table */}
              {(invoice?.variants || []).length > 0 && (
                <div className="mt-5 overflow-x-auto">
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    Product Variants
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-100">
                        <th className="px-3 py-2 border border-slate-200">
                          Size
                        </th>
                        <th className="px-3 py-2 border border-slate-200">
                          Color
                        </th>
                        <th className="px-3 py-2 border border-slate-200 text-right">
                          Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice?.variants || []).map((variant, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 border border-slate-200">
                            {variant?.size || "N/A"}
                          </td>
                          <td className="px-3 py-2 border border-slate-200">
                            {variant?.color || "N/A"}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-right">
                            {Number(variant?.quantity || 0).toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-sm text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">Note</div>
                  <div className="rounded-lg border border-slate-200 p-3 min-h-[56px]">
                    {invoice?.note || "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Total Quantity</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.quantity || 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Total Amount</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.amount || 0).toFixed(0)} ৳
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 mt-2 pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">
                      Grand Total
                    </span>
                    <span className="font-bold text-slate-900">
                      {Number(invoice?.amount || 0).toFixed(0)} ৳
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-slate-500">
                Thank you for your business.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200 text-slate-900 font-semibold hover:bg-slate-50"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseRequisionTable;
