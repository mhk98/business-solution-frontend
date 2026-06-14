import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, X } from "lucide-react";
import Select from "react-select";

import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { useGetAllProductWithoutQueryQuery } from "../../features/product/product";
import { useInsertPosReportMutation } from "../../features/posReport/posReport";
import { useGetAllInventoryOverviewQuery } from "../../features/inventoryOverview/inventoryOverview";

export default function SellPosTable() {
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // ✅ Drawer state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // ✅ Invoice modal state
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const invoiceRef = useRef(null);

  // ✅ Payment form
  const [sellDate, setSellDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // ✅ NEW: Warranty (Drawer)
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyValue, setWarrantyValue] = useState("");
  const [warrantyUnit, setWarrantyUnit] = useState("Day"); // Day | Month | Year

  // ✅ Insert POS Report mutation
  const [insertPosReport, { isLoading: isSavingPayment }] =
    useInsertPosReportMutation();

  // Pagination
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
  }, [productName, itemsPerPage]);

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
      Math.min(prev + pagesPerSet, Math.max(1, totalPages - pagesPerSet + 1)),
    );

  // ✅ Query args
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      name: productName || undefined,
    };
    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });
    return args;
  }, [currentPage, itemsPerPage, productName]);

  const { data, isLoading, isError, error } =
    useGetAllInventoryOverviewQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching received product data", error);
      return;
    }
    if (!isLoading && data) {
      setProducts(data.data || []);
      setTotalPages(
        Math.max(1, Math.ceil((data?.meta?.count || 0) / itemsPerPage)),
      );
    }
  }, [data, isLoading, isError, error, itemsPerPage]);

  // ✅ All products (for dropdown + name mapping)
  const {
    data: allProductsRes,
    isLoading: isLoadingAllProducts,
    isError: isErrorAllProducts,
    error: errorAllProducts,
  } = useGetAllProductWithoutQueryQuery();

  const productsData = allProductsRes?.data || [];

  useEffect(() => {
    if (isErrorAllProducts)
      console.error("Error fetching products", errorAllProducts);
  }, [isErrorAllProducts, errorAllProducts]);

  // ✅ Dropdown options
  const productDropdownOptions = useMemo(() => {
    return (productsData || []).map((p) => ({
      value: String(p.Id),
      label: p.name,
    }));
  }, [productsData]);

  // ✅ productId -> productName map
  const productNameMap = useMemo(() => {
    const m = new Map();
    (productsData || []).forEach((p) => {
      const key = String(p.Id);
      m.set(key, p.name);
    });
    return m;
  }, [productsData]);

  // ---- Normalizers ----
  const getReceivedId = (rp) => String(rp.Id);
  const getReceivedPrice = (rp) => Number(rp.sale_price);
  const getReceivedStock = (rp) => Number(rp.quantity);
  const getVariantRows = (record) => {
    if (Array.isArray(record?.variants)) return record.variants;
    if (typeof record?.variants === "string") {
      try {
        const parsed = JSON.parse(record.variants);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const getVariantKey = (variant) =>
    `${String(variant?.size || "").trim()}__${String(variant?.color || "").trim()}`;
  const getVariantLabel = (variant) =>
    [variant?.size || "N/A", variant?.color || "N/A"].join(" / ");
  const getCartKey = (id, variant) =>
    variant ? `${id}__${getVariantKey(variant)}` : String(id);

  const resolveProductName = (rp) => {
    const pid = rp.product?.Id;

    if (rp.productName) return rp.productName;
    if (rp.product?.name) return rp.product?.name;
    if (rp.name) return rp.name;

    if (pid === null || pid === undefined || pid === "") return "N/A";

    const byId = productNameMap.get(String(pid));
    if (byId) return byId;

    return "N/A";
  };

  // ✅ react-select styles
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

  // Cart
  const addToCart = (p) => {
    setCart((prev) => {
      const itemKey = p.cartKey || getCartKey(p.Id, p.variant);
      const exists = prev.find((x) => x.cartKey === itemKey);
      if (exists) {
        return prev.map((x) =>
          x.cartKey === itemKey
            ? { ...x, qty: Math.min(Number(x.maxQty || Infinity), x.qty + 1) }
            : x,
        );
      }
      return [
        ...prev,
        {
          Id: p.Id,
          cartKey: itemKey,
          name: p.name,
          price: p.price,
          qty: 1,
          maxQty: p.maxQty || 0,
          variant: p.variant || null,
        },
      ];
    });
  };

  const removeFromCart = (cartKey) =>
    setCart((prev) => prev.filter((x) => x.cartKey !== cartKey));

  const updateQty = (cartKey, qty) => {
    const n = Number(qty) || 0;
    setCart((prev) =>
      prev.map((x) =>
        x.cartKey === cartKey
          ? { ...x, qty: Math.min(Number(x.maxQty || Infinity), Math.max(1, n)) }
          : x,
      ),
    );
  };

  const subTotal = useMemo(() => {
    return cart.reduce(
      (sum, x) => sum + (Number(x.price) || 0) * (Number(x.qty) || 0),
      0,
    );
  }, [cart]);

  const total = useMemo(() => {
    const d = Number(discount) || 0;
    const dc = Number(deliveryCharge) || 0;
    return Math.max(0, subTotal - d + dc);
  }, [subTotal, discount, deliveryCharge]);

  // ✅ open/close drawer
  const openPayment = () => {
    setPaidAmount(total);
    setIsPaymentOpen(true);
  };
  const closePayment = () => setIsPaymentOpen(false);

  // ✅ payload builder (NOW includes warranty)
  const buildPosPayload = () => {
    const items = cart.map((x) => ({
      Id: x.Id,
      qty: Number(x.qty) || 0,
      price: Number(x.price) || 0,
      total: (Number(x.price) || 0) * (Number(x.qty) || 0),
      name: x.name,
      variants: x.variant
        ? [
            {
              ...x.variant,
              quantity: Number(x.qty) || 0,
            },
          ]
        : [],
    }));

    return {
      date: sellDate,
      name: customerName,
      mobile: customerPhone,
      address: customerAddress,
      note,
      subTotal: Number(subTotal) || 0,
      discount: Number(discount) || 0,
      deliveryCharge: Number(deliveryCharge) || 0,
      total: Number(total) || 0,

      paidAmount: Number(paidAmount) || 0,
      dueAmount: Math.max(0, (Number(total) || 0) - (Number(paidAmount) || 0)),

      // ✅ NEW
      warrantyValue: hasWarranty ? Number(warrantyValue || 0) : 0,
      warrantyUnit: hasWarranty ? warrantyUnit : null,

      items,
    };
  };

  // ✅ Print handler
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    contentRef: invoiceRef,
    documentTitle: invoiceData?.invoiceNo
      ? String(invoiceData.invoiceNo)
      : "invoice",
    removeAfterPrint: true,
  });

  // ✅ PDF Download handler
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
        : `invoice-${Date.now()}.pdf`;

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
      alert("PDF generate করতে সমস্যা হচ্ছে। Console দেখুন.");
    }
  };

  // ✅ Confirm Payment -> insert via API
  const handleConfirmPayment = async () => {
    try {
      if (cart.length === 0) return;

      const payload = buildPosPayload();

      const res = await insertPosReport(payload).unwrap();

      const invoice = res?.data ||
        res?.posReport ||
        res || {
          invoiceNo: res?.invoiceNo || `INV-${Date.now()}`,
          date: payload.date,
          customer: {
            name: payload.name,
            mobile: payload.mobile,
            address: payload.address,
          },
          subTotal: payload.subTotal,
          discount: payload.discount,
          deliveryCharge: payload.deliveryCharge,
          total: payload.total,
          paidAmount: payload.paidAmount,
          dueAmount: payload.dueAmount,
          items: payload.items,
          note: payload.note,

          // ✅ keep warranty in invoice too (optional)
          warrantyValue: payload.warrantyValue,
          warrantyUnit: payload.warrantyUnit,
        };

      const normalizedInvoice = normalizeInvoice(invoice, payload);

      setInvoiceData(normalizedInvoice);
      setInvoiceOpen(true);

      // reset
      setCart([]);
      setDiscount(0);
      setDeliveryCharge(0);
      setPaidAmount(0);
      setNote("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");

      // ✅ reset warranty
      setHasWarranty(false);
      setWarrantyValue("");
      setWarrantyUnit("Day");

      closePayment();
    } catch (err) {
      console.error("POS insert failed:", err);
    }
  };

  return (
    <>
      <motion.div
        className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left panel */}
          <div className="col-span-12 lg:col-span-6">
            <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden bg-white">
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center w-full px-4 pb-4">
                <div className="mt-3 flex gap-2">
                  <div className="flex flex-col w-full">
                    <label className="text-sm text-slate-600 mb-1 ms-1">
                      Product
                    </label>

                    <Select
                      options={productDropdownOptions}
                      value={
                        productDropdownOptions.find(
                          (o) => o.label === productName,
                        ) || null
                      }
                      onChange={(selected) =>
                        setProductName(selected?.label || "")
                      }
                      placeholder={
                        isLoadingAllProducts ? "Loading..." : "Select Product"
                      }
                      isClearable
                      className="text-black"
                      isDisabled={isLoadingAllProducts}
                      styles={selectStyles}
                    />
                  </div>
                </div>

                <div className="flex flex-col w-full mt-3">
                  <label className="text-sm text-slate-600 mb-1">
                    Per Page
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                      setStartPage(1);
                    }}
                    className="px-3 py-[10px] rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {products.map((p) => {
                  const rid = getReceivedId(p);
                  const name = resolveProductName(p);
                  const price = getReceivedPrice(p);
                  const stock = getReceivedStock(p);
                  const variantRows = getVariantRows(p).filter(
                    (variant) => Number(variant?.quantity || 0) > 0,
                  );
                  const hasVariants = variantRows.length > 0;

                  return (
                    <div
                      key={rid}
                      className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 group hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-lg group-hover:bg-white transition-colors shadow-sm shadow-slate-200/50">
                          📦
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {name}
                          </div>

                          <div className="mt-0.5 flex items-center gap-3 text-xs font-semibold text-slate-500">
                            <span className="text-emerald-600">
                              ৳{Number(price).toLocaleString()}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>Stock: {stock}</span>
                          </div>
                          {hasVariants ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {variantRows.map((variant, index) => {
                                const variantPrice = Number(
                                  variant?.sale_price || price,
                                );
                                const variantStock = Number(
                                  variant?.quantity || 0,
                                );
                                return (
                                  <button
                                    key={`${rid}-${getVariantKey(variant)}-${index}`}
                                    onClick={() =>
                                      addToCart({
                                        Id: rid,
                                        name: `${name} (${getVariantLabel(variant)})`,
                                        price: variantPrice,
                                        maxQty: variantStock,
                                        variant: {
                                          size: variant?.size || "",
                                          color: variant?.color || "",
                                          purchase_price:
                                            Number(variant?.purchase_price) || 0,
                                          sale_price: variantPrice,
                                          sku: variant?.sku || "",
                                        },
                                      })
                                    }
                                    type="button"
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                                    disabled={variantStock <= 0}
                                  >
                                    <span className="block text-slate-900">
                                      {getVariantLabel(variant)}
                                    </span>
                                    <span className="block text-slate-500">
                                      Qty {variantStock} · ৳
                                      {variantPrice.toLocaleString()}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center self-end sm:self-center">
                        <button
                          onClick={() =>
                            addToCart({
                              Id: rid,
                              name,
                              price,
                              maxQty: stock,
                            })
                          }
                          className="h-9 px-5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-sm shadow-indigo-100 disabled:opacity-50 active:scale-95"
                          type="button"
                          disabled={!rid || stock <= 0 || hasVariants}
                        >
                          {hasVariants ? "Select Variant" : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {products.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No products found
                  </div>
                ) : null}
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
          </div>

          {/* Right panel */}
          <div className="col-span-12 lg:col-span-6">
            <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden bg-white flex flex-col min-h-[80vh]">
              <div className="flex-1 p-4">
                {cart.length === 0 ? (
                  <div className="h-full flex items-start justify-center pt-16">
                    <div className="text-slate-600 text-sm">
                      No product selected
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((x) => (
                      <div
                        key={x.cartKey}
                        className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition hover:border-indigo-200 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate uppercase tracking-tight">
                            {x.name}
                          </div>
                          <div className="text-xs text-indigo-600 font-bold mt-1">
                            ৳{Number(x.price || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden h-9 shadow-sm">
                            <button
                              onClick={() =>
                                updateQty(
                                  x.cartKey,
                                  Math.max(1, (x.qty || 1) - 1),
                                )
                              }
                              className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-500 transition border-r border-slate-100"
                            >
                              -
                            </button>
                            <input
                              value={x.qty}
                              onChange={(e) =>
                                updateQty(x.cartKey, e.target.value)
                              }
                              className="w-12 h-full text-center text-slate-900 text-xs font-bold outline-none bg-transparent"
                              type="number"
                              min={1}
                            />
                            <button
                              onClick={() =>
                                updateQty(x.cartKey, (x.qty || 1) + 1)
                              }
                              className="w-8 h-full flex items-center justify-center hover:bg-slate-50 text-slate-500 transition border-l border-slate-100"
                            >
                              +
                            </button>
                          </div>

                          <div className="w-20 text-right text-xs font-extrabold text-slate-900">
                            ৳
                            {(
                              (Number(x.price) || 0) * (Number(x.qty) || 0)
                            ).toLocaleString()}
                          </div>

                          <button
                            onClick={() => removeFromCart(x.cartKey)}
                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition active:scale-95"
                            type="button"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom area */}
              <div className="border-t border-gray-200">
                <div className="px-4 py-3">
                  <div className="flex justify-center -mt-6">
                    <button
                      type="button"
                      onClick={() => setIsSummaryOpen((p) => !p)}
                      className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shadow"
                      aria-label="Toggle summary"
                    >
                      <motion.div
                        animate={{ rotate: isSummaryOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowDown />
                      </motion.div>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isSummaryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, y: 12 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: 12 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-3">
                          <Row
                            label="Subtotal"
                            right={
                              <span className="font-semibold text-black">
                                {subTotal.toFixed(0)} ৳
                              </span>
                            }
                          />

                          <Row
                            label="Discount"
                            right={
                              <div className="flex items-center gap-2">
                                <input
                                  value={discount}
                                  onChange={(e) =>
                                    setDiscount(Number(e.target.value) || 0)
                                  }
                                  className="h-9 w-28 bg-white rounded-md border border-gray-200 px-2 text-sm text-right outline-none"
                                  type="number"
                                  min={0}
                                />
                                <div className="h-9 w-12 rounded-md border border-gray-200 flex items-center justify-center text-sm text-black">
                                  ৳
                                </div>
                              </div>
                            }
                          />

                          <Row
                            label="Delivery Charge"
                            right={
                              <input
                                value={deliveryCharge}
                                onChange={(e) =>
                                  setDeliveryCharge(Number(e.target.value) || 0)
                                }
                                className="h-9 w-44 rounded-md border bg-white border-gray-200 px-2 text-sm text-right outline-none"
                                type="number"
                                min={0}
                              />
                            }
                          />

                          <Row
                            label="Total"
                            right={
                              <span className="font-semibold text-red-500">
                                {total.toFixed(0)} ৳
                              </span>
                            }
                          />

                          <div className="flex flex-col items-end">
                            <button
                              className="py-2 rounded-lg px-3 bg-white border border-gray-200 text-black font-semibold hover:bg-gray-50 disabled:opacity-60"
                              type="button"
                              onClick={openPayment}
                              disabled={cart.length === 0}
                            >
                              Payment →
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ✅ Payment Drawer */}
      <PaymentDrawer
        open={isPaymentOpen}
        onClose={closePayment}
        total={total}
        sellDate={sellDate}
        setSellDate={setSellDate}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        note={note}
        setNote={setNote}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerAddress={customerAddress}
        setCustomerAddress={setCustomerAddress}
        onConfirm={handleConfirmPayment}
        isSaving={isSavingPayment}
        // ✅ NEW
        hasWarranty={hasWarranty}
        setHasWarranty={setHasWarranty}
        warrantyValue={warrantyValue}
        setWarrantyValue={setWarrantyValue}
        warrantyUnit={warrantyUnit}
        setWarrantyUnit={setWarrantyUnit}
      />

      {/* ✅ Invoice Preview Modal */}
      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        invoice={invoiceData}
        invoiceRef={invoiceRef}
        onPrint={handlePrint}
        onDownload={handleDownloadPdf}
      />
    </>
  );
}

function Row({ label, right }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="text-black">{label}</div>
      <div className="text-black">{right}</div>
    </div>
  );
}

function PaymentDrawer({
  open,
  onClose,
  total,
  sellDate,
  setSellDate,
  paidAmount,
  setPaidAmount,
  note,
  setNote,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  onConfirm,
  isSaving,
}) {
  const safeTotal = Number(total) || 0;
  const dueAmount = Math.max(0, safeTotal - (Number(paidAmount) || 0));

  const handlePaidAmountChange = (value) => {
    const nextPaidAmount = Math.min(Math.max(0, Number(value) || 0), safeTotal);
    setPaidAmount(nextPaidAmount);
  };

  const handleDueAmountChange = (value) => {
    const nextDueAmount = Math.min(Math.max(0, Number(value) || 0), safeTotal);
    setPaidAmount(Math.max(0, safeTotal - nextDueAmount));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white/95 backdrop-blur-xl z-[90] shadow-[-20px_0_50px_rgba(0,0,0,0.1)] flex flex-col border-l border-white/20"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
              <div>
                <div className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  Checkout
                </div>
                <div className="text-xs font-bold text-slate-400 mt-0.5">
                  Finalize transaction & payment
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-2xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition active:scale-90"
                type="button"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-8 py-6 space-y-6 scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Transaction Date">
                  <input
                    value={sellDate}
                    onChange={(e) => setSellDate(e.target.value)}
                    type="date"
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
                  />
                </Field>

                <Field label="Paid Amount" required>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ৳
                    </span>
                    <input
                      value={paidAmount}
                      onChange={(e) => handlePaidAmountChange(e.target.value)}
                      type="number"
                      min={0}
                      max={safeTotal}
                      className="w-full h-12 rounded-xl border border-slate-200 pl-8 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
                    />
                  </div>
                </Field>

                <Field label="Due Amount">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ৳
                    </span>
                    <input
                      value={dueAmount}
                      onChange={(e) => handleDueAmountChange(e.target.value)}
                      type="number"
                      min={0}
                      max={safeTotal}
                      className="w-full h-12 rounded-xl border border-slate-200 pl-8 pr-4 text-sm font-bold text-rose-600 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
                    />
                  </div>
                </Field>
              </div>

              <Field label="Customer Name">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <span className="text-lg">👤</span>
                  </div>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    type="text"
                    placeholder="Enter customer name..."
                    className="w-full h-12 rounded-xl border border-slate-200 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
                  />
                </div>
              </Field>

              <Field label="Mobile Number">
                <div className="flex items-center gap-3">
                  <div className="h-12 px-4 rounded-xl border border-slate-200 flex items-center text-xs font-bold text-slate-500 bg-slate-50 shrink-0">
                    🇧🇩 +88
                  </div>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    type="text"
                    placeholder="XXXXXXXXXXX"
                    className="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
                  />
                </div>
              </Field>

              <Field label="Shipping Address">
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street address, city, area..."
                  className="w-full h-24 rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white resize-none"
                />
              </Field>

              <Field label="Payment Note / Remarks">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  type="text"
                  placeholder="Special instructions or notes..."
                  className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
                />
              </Field>

              {/* ✅ Warranty Section */}
              {/* <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-black text-slate-700 uppercase tracking-tight">
                      Warranty Coverage
                    </span>
                    <p className="text-[10px] font-bold text-slate-400">Enable if product has warranty</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setHasWarranty((p) => !p);
                      if (hasWarranty) {
                        setWarrantyValue("");
                        setWarrantyUnit("Day");
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${hasWarranty ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                  >
                    <span className="sr-only">Toggle Warranty</span>
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${hasWarranty ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>

                {hasWarranty && (
                  <div className="bg-white rounded-xl border border-slate-100 m-1 p-4 space-y-3 shadow-sm">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</label>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={warrantyValue}
                        onChange={(e) => setWarrantyValue(e.target.value)}
                        placeholder="30"
                        className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none
                         focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                      />

                      <select
                        value={warrantyUnit}
                        onChange={(e) => setWarrantyUnit(e.target.value)}
                        className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none
                         focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition appearance-none cursor-pointer"
                      >
                        <option value="Day">Days</option>
                        <option value="Month">Months</option>
                        <option value="Year">Years</option>
                      </select>
                    </div>
                  </div>
                )}
              </div> */}
            </div>

            {/* Bottom sticky bar */}
            <div className="border-t border-slate-200 px-8 py-6 bg-slate-50/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-slate-500">
                  Total Payable:
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  ৳{Number(total || 0).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isSaving}
                className="w-full h-10 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Transaction"
                )}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-800 mb-2">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </div>
      {children}
    </div>
  );
}

function InvoiceModal({ open, onClose, invoice, invoiceRef, onPrint }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-900">
              Invoice Preview
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

              {/* <button
                type="button"
                onClick={onDownload}
                disabled={!invoice}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-900 font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                Download PDF
              </button> */}

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
                    INVOICE
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

                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    Kafela Mart
                  </div>
                  <div className="text-xs text-slate-600">POS Sale Invoice</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    Bill To
                  </div>
                  <div className="text-sm text-slate-700">
                    {invoice?.customer?.name || "N/A"}
                  </div>
                  <div className="text-sm text-slate-700">
                    {invoice?.customer?.mobile || "N/A"}
                  </div>
                  <div className="text-sm text-slate-700">
                    {invoice?.customer?.address || "N/A"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900 mb-2">
                    Payment
                  </div>

                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Total</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.total || 0).toFixed(0)} ৳
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Paid</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.paidAmount || 0).toFixed(0)} ৳
                    </span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Due</span>
                    <span className="font-semibold text-red-600">
                      {Number(invoice?.dueAmount || 0).toFixed(0)} ৳
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-100">
                      <th className="px-3 py-2 border border-slate-200">
                        Item
                      </th>
                      <th className="px-3 py-2 border border-slate-200">Qty</th>
                      <th className="px-3 py-2 border border-slate-200">
                        Price
                      </th>
                      <th className="px-3 py-2 border border-slate-200 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice?.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 border border-slate-200">
                          {it?.name || "N/A"}
                        </td>
                        <td className="px-3 py-2 border border-slate-200">
                          {Number(it?.qty || 0)}
                        </td>
                        <td className="px-3 py-2 border border-slate-200">
                          {Number(it?.price || 0).toFixed(0)} ৳
                        </td>
                        <td className="px-3 py-2 border border-slate-200 text-right">
                          {Number(it?.total || 0).toFixed(0)} ৳
                        </td>
                      </tr>
                    ))}
                    {(!invoice?.items || invoice.items.length === 0) && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-8 border border-slate-200 text-center text-slate-500"
                        >
                          No items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-sm text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">Note</div>
                  <div className="rounded-lg border border-slate-200 p-3 min-h-[56px]">
                    {invoice?.note || "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.subTotal || 0).toFixed(0)} ৳
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Discount</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.discount || 0).toFixed(0)} ৳
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 mt-1">
                    <span>Delivery</span>
                    <span className="font-semibold text-slate-900">
                      {Number(invoice?.deliveryCharge || 0).toFixed(0)} ৳
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700 mt-2 pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">
                      Grand Total
                    </span>
                    <span className="font-bold text-slate-900">
                      {Number(invoice?.total || 0).toFixed(0)} ৳
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-slate-500">
                Thank you for your purchase.
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

function normalizeInvoice(raw, payloadFallback) {
  if (!raw) return null;

  const inv = { ...raw };

  inv.invoiceNo =
    inv.invoiceNo ||
    inv.invoice_no ||
    inv.voucherNo ||
    inv.id ||
    `INV-${Date.now()}`;

  inv.date =
    inv.date || inv.createdAt || inv.created_at || payloadFallback?.date;

  const customer =
    inv.customer ||
    inv.Customer ||
    (inv.name || inv.mobile || inv.address
      ? {
          name: inv.name || "",
          mobile: inv.mobile || "",
          address: inv.address || "",
        }
      : null) ||
    (payloadFallback
      ? {
          name: payloadFallback.name,
          mobile: payloadFallback.mobile,
          address: payloadFallback.address,
        }
      : null);

  inv.customer = {
    name: customer?.name || "",
    mobile: customer?.mobile || "",
    address: customer?.address || "",
  };

  inv.subTotal = Number(
    inv.subTotal ?? inv.sub_total ?? payloadFallback?.subTotal ?? 0,
  );
  inv.discount = Number(inv.discount ?? payloadFallback?.discount ?? 0);
  inv.deliveryCharge = Number(
    inv.deliveryCharge ??
      inv.delivery_charge ??
      payloadFallback?.deliveryCharge ??
      0,
  );
  inv.total = Number(inv.total ?? payloadFallback?.total ?? 0);
  inv.paidAmount = Number(
    inv.paidAmount ?? inv.paid_amount ?? payloadFallback?.paidAmount ?? 0,
  );
  inv.dueAmount = Number(
    inv.dueAmount ?? inv.due_amount ?? payloadFallback?.dueAmount ?? 0,
  );

  inv.note = inv.note ?? inv.remarks ?? payloadFallback?.note ?? "";

  const itemsRaw =
    inv.items || inv.Items || inv.products || payloadFallback?.items || [];
  inv.items = (itemsRaw || []).map((it) => ({
    name: it?.name || it?.productName || it?.product?.name || "N/A",
    qty: Number(it?.qty ?? it?.quantity ?? 0),
    price: Number(it?.price ?? it?.unitPrice ?? 0),
    total:
      Number(it?.total ?? 0) || Number(it?.qty ?? 0) * Number(it?.price ?? 0),
  }));

  return inv;
}
