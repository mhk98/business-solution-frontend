import { motion } from "framer-motion";
import { Edit, Notebook, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import Modal from "../common/Modal";
import {
  useDeleteEmployeeListMutation,
  useGetAllEmployeeListQuery,
  useGetAllEmployeeListWithoutQueryQuery,
  useInsertEmployeeListMutation,
  useUpdateEmployeeListMutation,
} from "../../features/employeeList/employeeList";
import { useGetAllDepartmentsQuery } from "../../features/department/department";
import { useGetAllTeamsQuery } from "../../features/team/team";
import { useGetAllDesignationsQuery } from "../../features/designation/designation";

const EmployeeListTable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);

  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  const [currentProduct, setCurrentProduct] = useState(null);

  const [createProduct, setCreateProduct] = useState({
    name: "",
    employee_id: "",
    salary: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
    joiningDate: new Date().toISOString().slice(0, 10),
    departmentId: "",
    teamId: "",
    designationId: "",
  });

  const [products, setProducts] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // store selected name
  const [name, setName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  // ✅ Per-page user selectable (EmployeeTable like)
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // All products for select
  const [productsData, setProductsData] = useState([]);

  const {
    data: data2,
    isLoading: isLoading2,
    isError: isError2,
    error: error2,
  } = useGetAllEmployeeListWithoutQueryQuery();

  const { data: departmentsData, isLoading: isDepartmentsLoading } =
    useGetAllDepartmentsQuery({ page: 1, limit: 500 });
  const { data: teamsData, isLoading: isTeamsLoading } =
    useGetAllTeamsQuery({ page: 1, limit: 500 });
  const { data: designationsData, isLoading: isDesignationsLoading } =
    useGetAllDesignationsQuery({ page: 1, limit: 500 });

  useEffect(() => {
    if (isError2) {
      console.error("Error fetching products", error2);
    } else if (!isLoading2 && data2) {
      setProductsData(data2.data || []);
    }
  }, [data2, isLoading2, isError2, error2]);

  // Responsive pagesPerSet
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

  // filter change হলে page reset
  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [
    startDate,
    endDate,
    name,
    selectedDepartment,
    selectedDesignation,
    itemsPerPage,
  ]);

  // startDate > endDate হলে endDate ঠিক করে দেবে
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  // Query args
  const queryArgs = useMemo(() => {
    const args = {
      page: currentPage,
      limit: itemsPerPage,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      name: name || undefined,
      departmentId: selectedDepartment?.value || undefined,
      designationId: selectedDesignation?.value || undefined,
    };

    Object.keys(args).forEach((k) => {
      if (args[k] === undefined || args[k] === null || args[k] === "")
        delete args[k];
    });

    return args;
  }, [
    currentPage,
    itemsPerPage,
    startDate,
    endDate,
    name,
    selectedDepartment,
    selectedDesignation,
  ]);

  const { data, isLoading, isError, error, refetch } =
    useGetAllEmployeeListQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching product data", error);
    } else if (!isLoading && data) {
      setProducts(data.data || []);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, currentPage, itemsPerPage]);

  // Modals
  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
  };
  const handleAddProduct = () => setIsModalOpen1(true);
  const handleModalClose1 = () => {
    setIsModalOpen1(false);
    setCreateProduct({
      name: "",
      employee_id: "",
      salary: "",
      note: "",
      date: new Date().toISOString().slice(0, 10),
      joiningDate: new Date().toISOString().slice(0, 10),
      departmentId: "",
      teamId: "",
      designationId: "",
    });
  };

  const [updateEmployeeList] = useUpdateEmployeeListMutation();
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const handleModalClose2 = () => {
    setIsModalOpen2(false);
    setCurrentProduct(null);
  };

  const handleEditClick1 = (product) => {
    setCurrentProduct({
      ...product,
      salary: product.salary ?? "",
      employee_id: product.employee_id ?? "",
      name: product.name ?? "",
      note: product.note ?? "",
      status: product.status ?? "",
      joiningDate: product.joiningDate ?? product.date ?? "",
      departmentId: product.departmentId ? String(product.departmentId) : "",
      teamId: product.teamId ? String(product.teamId) : "",
      designationId: product.designationId ? String(product.designationId) : "",
      userId: userId,
    });
    setIsModalOpen2(true);
  };

  const handleUpdateProduct1 = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (currentProduct?.note === "" || currentProduct?.note === null)
      return toast.error("Note is required!");

    try {
      const payload = {
        name: currentProduct.name.trim(),
        employee_id: Number(currentProduct.employee_id),
        salary: Number(currentProduct.salary),
        price: Number(currentProduct.salary),
        note: currentProduct.note,
        status: currentProduct.status,
        joiningDate: currentProduct.joiningDate,
        departmentId: currentProduct.departmentId || null,
        teamId: currentProduct.teamId || null,
        designationId: currentProduct.designationId || null,
        userId: userId,
        actorRole: role,
      };

      const res = await updateEmployeeList({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen2(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleEditClick = (product) => {
    setCurrentProduct({
      ...product,
      salary: product.salary ?? product.price ?? "",
      employee_id: product.employee_id ?? "",
      name: product.name ?? "",
      note: product.note ?? "",
      status: product.status ?? "",
      date: product.date ?? "",
      joiningDate: product.joiningDate ?? product.date ?? "",
      departmentId: product.departmentId ? String(product.departmentId) : "",
      teamId: product.teamId ? String(product.teamId) : "",
      designationId: product.designationId ? String(product.designationId) : "",
      userId: userId,
    });
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct?.Id) return toast.error("Invalid item!");
    if (!currentProduct?.name?.trim()) return toast.error("Name is required!");
    if (!currentProduct?.employee_id?.toString().trim())
      return toast.error("Employee Id is required!");
    if (currentProduct?.salary === "" || currentProduct?.salary === null)
      return toast.error("Salary is required!");

    try {
      const payload = {
        name: currentProduct.name.trim(),
        employee_id: Number(currentProduct.employee_id),
        salary: Number(currentProduct.salary),
        price: Number(currentProduct.salary),
        note: currentProduct.note,
        status: currentProduct.status,
        date: currentProduct.date,
        joiningDate: currentProduct.joiningDate,
        departmentId: currentProduct.departmentId || null,
        teamId: currentProduct.teamId || null,
        designationId: currentProduct.designationId || null,
        userId: userId,
        actorRole: role,
      };

      const res = await updateEmployeeList({
        id: currentProduct.Id,
        data: payload,
      }).unwrap();

      if (res?.success) {
        toast.success("Successfully updated product!");
        setIsModalOpen(false);
        refetch?.();
      } else {
        toast.error(res?.message || "Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  // Insert
  const [insertEmployeeList] = useInsertEmployeeListMutation();
  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!createProduct.name?.trim()) return toast.error("Name is required!");
    if (!createProduct.employee_id?.toString().trim())
      return toast.error("Employee Id is required!");
    if (!createProduct.salary) return toast.error("Salary is required!");

    try {
      const payload = {
        name: createProduct.name.trim(),
        employee_id: Number(createProduct.employee_id),
        salary: Number(createProduct.salary),
        date: createProduct.date,
        joiningDate: createProduct.joiningDate,
        note: createProduct.note,
        departmentId: createProduct.departmentId || null,
        teamId: createProduct.teamId || null,
        designationId: createProduct.designationId || null,
      };

      const res = await insertEmployeeList(payload).unwrap();
      if (res?.success) {
        toast.success("Successfully created product");
        setIsModalOpen1(false);
        setCreateProduct({
          name: "",
          employee_id: "",
          salary: "",
          note: "",
          date: new Date().toISOString().slice(0, 10),
          joiningDate: new Date().toISOString().slice(0, 10),
          departmentId: "",
          teamId: "",
          designationId: "",
        });
        refetch?.();
      } else {
        toast.error(res?.message || "Create failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  // Delete
  const [deleteEmployeeList] = useDeleteEmployeeListMutation();
  const handleDeleteProduct = async (id) => {
    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this product?",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteEmployeeList({ id }).unwrap();
      if (res?.success) {
        toast.success("Product deleted successfully!");
        refetch?.();
      } else {
        toast.error(res?.message || "Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // Filters clear
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setName("");
    setSelectedDepartment(null);
    setSelectedDesignation(null);
  };

  // Pagination calculations
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

  // Select options (light)
  const productOptions = useMemo(
    () =>
      (productsData || []).map((p) => ({
        value: p.name,
        label: p.name,
      })),
    [productsData],
  );

  const departmentOptions = useMemo(
    () =>
      (departmentsData?.data || []).map((d) => ({
        value: String(d.Id ?? d.id ?? ""),
        label: d.name || "Unnamed Department",
      })),
    [departmentsData],
  );

  const teamOptions = useMemo(
    () =>
      (teamsData?.data || []).map((t) => ({
        value: String(t.Id ?? t.id ?? ""),
        label: t.name || "Unnamed Team",
      })),
    [teamsData],
  );

  const designationOptions = useMemo(
    () =>
      (designationsData?.data || []).map((d) => ({
        value: String(d.Id ?? d.id ?? ""),
        label: d.name || "Unnamed Designation",
        departmentId: d.departmentId ? String(d.departmentId) : "",
      })),
    [designationsData],
  );

  const getDesignationOptions = (departmentId) => {
    const normalizedDepartmentId = departmentId ? String(departmentId) : "";
    if (!normalizedDepartmentId) return designationOptions;

    return designationOptions.filter(
      (option) =>
        !option.departmentId || option.departmentId === normalizedDepartmentId,
    );
  };

  const getDepartmentLabel = (product) =>
    product?.department?.name ||
    departmentOptions.find(
      (option) => option.value === String(product?.departmentId || ""),
    )?.label ||
    "-";

  const getDesignationLabel = (product) =>
    product?.designation?.name ||
    designationOptions.find(
      (option) => option.value === String(product?.designationId || ""),
    )?.label ||
    "-";

  // ✅ React-select styles (light like EmployeeTable)
  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 44,
        borderRadius: 12,
        borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0",
        boxShadow: state.isFocused
          ? "0 0 0 4px rgba(99, 102, 241, 0.15)"
          : "none",
        "&:hover": { borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1" },
      }),
      valueContainer: (base) => ({ ...base, padding: "0 12px" }),
      placeholder: (base) => ({ ...base, color: "#64748b" }),
      singleValue: (base) => ({ ...base, color: "#0f172a" }),
      menu: (base) => ({
        ...base,
        borderRadius: 12,
        overflow: "hidden",
        zIndex: 60,
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? "rgba(99, 102, 241, 0.12)"
          : state.isFocused
            ? "#f8fafc"
            : "#fff",
        color: "#0f172a",
      }),
    }),
    [],
  );

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteModalClose = () => {
    setIsNoteModalOpen(false);
  };

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Top actions */}
      <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleAddProduct}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm font-semibold"
        >
          Add <Plus size={18} />
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <div className="flex items-center gap-2 text-slate-700">
            <ShoppingBasket size={18} className="text-amber-500" />
            <span className="text-sm">Total Salary</span>
          </div>

          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading
              ? "Loading..."
              : Number(
                  data?.meta?.totalSalary ??
                    products.reduce(
                      (sum, item) =>
                        sum + Number(item.salary ?? item.price ?? 0),
                      0,
                    ),
                ).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4 items-end mb-6 w-full justify-center mx-auto">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex items-center justify-center md:mt-0">
          <Select
            options={productOptions}
            value={productOptions.find((o) => o.value === name) || null}
            onChange={(selected) =>
              setName(selected?.value ? String(selected.value) : "")
            }
            placeholder="Select Employee"
            isClearable
            styles={selectStyles}
            className="w-full"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Department</label>
          <Select
            options={departmentOptions}
            value={selectedDepartment}
            onChange={(selected) => {
              setSelectedDepartment(selected || null);
              setSelectedDesignation(null);
            }}
            placeholder={isDepartmentsLoading ? "Loading..." : "Select Department"}
            isClearable
            isLoading={isDepartmentsLoading}
            styles={selectStyles}
            className="w-full"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Designation</label>
          <Select
            options={getDesignationOptions(selectedDepartment?.value)}
            value={selectedDesignation}
            onChange={(selected) => setSelectedDesignation(selected || null)}
            placeholder={
              isDesignationsLoading ? "Loading..." : "Select Designation"
            }
            isClearable
            isLoading={isDesignationsLoading}
            styles={selectStyles}
            className="w-full"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Per Page</label>
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

        <button
          className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition px-4 py-[10px] rounded-xl border border-slate-200"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Name",
                "Department",
                "Designation",
                "Joining Date",
                "Salary",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {(products || []).map((product) => (
              <motion.tr
                key={product.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {product.name}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {getDepartmentLabel(product)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {getDesignationLabel(product)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {product.joiningDate || "-"}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(product.salary ?? product.price ?? 0).toFixed(2)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                      product.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : product.status === "Active"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : product.status === "Deactive"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {product.status}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    {/* <button
                      className={`relative h-10 w-10 rounded-md flex items-center justify-center hover:bg-slate-100 transition ${product.note ? 'text-indigo-600' : 'text-slate-400'}`}
                      title={product.note || "No note"}
                      type="button"
                      onClick={() => product.note && handleNoteClick(product.note)}
                    >
                      <Notebook size={18} />
                      {product.note && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </button> */}

                    {product.note ? (
                      <div className="relative">
                        <button
                          className="relative h-10 w-10 rounded-md flex items-center justify-center"
                          title={product.note}
                          type="button"
                          onClick={() => handleNoteClick(product.note)}
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
                        title="No note available"
                        type="button"
                      >
                        <Notebook size={18} className="text-slate-300" />
                      </button>
                    )}

                    <button
                      onClick={() => handleEditClick(product)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                      title="Edit"
                    >
                      <Edit size={18} className="text-indigo-600" />
                    </button>

                    {role === "superAdmin" || role === "admin" ? (
                      <button
                        onClick={() => handleDeleteProduct(product.Id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditClick1(product)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                        title="Delete Request / Note"
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}

            {!isLoading && products.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-6 text-center text-sm text-slate-600"
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
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition font-semibold"
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
              className={`px-4 py-2 rounded-xl border transition font-bold ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
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
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition font-semibold"
        >
          Next
        </button>
      </div>

      {/* Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleNoteModalClose}
        title="Employee Note"
      >
        <div className="p-2">
          <p className="text-slate-600 leading-relaxed font-medium capitalize prose-slate">
            {noteContent}
          </p>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Edit Employee Salary"
      >
        <div className="grid grid-cols-1 gap-5">
          <Field
            label="Date"
            type="date"
            value={currentProduct?.date}
            onChange={(v) => setCurrentProduct({ ...currentProduct, date: v })}
            required
          />
          <Field
            label="Employee Name"
            value={currentProduct?.name || ""}
            onChange={(v) => setCurrentProduct({ ...currentProduct, name: v })}
          />

          <Field
            label="Employee Id"
            value={currentProduct?.employee_id || ""}
            onChange={(v) =>
              setCurrentProduct({ ...currentProduct, employee_id: v })
            }
            required
            placeholder="Enter employee id"
          />

          <Field
            label="Salary"
            type="number"
            step="0.01"
            value={currentProduct?.salary || ""}
            onChange={(v) =>
              setCurrentProduct({ ...currentProduct, salary: v })
            }
          />

          <Field
            label="Joining Date"
            type="date"
            value={currentProduct?.joiningDate || ""}
            onChange={(v) =>
              setCurrentProduct({ ...currentProduct, joiningDate: v })
            }
          />

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Department
            </label>
            <Select
              options={departmentOptions}
              value={departmentOptions.find((o) => o.value === (currentProduct?.departmentId || "")) || null}
              onChange={(selected) =>
                setCurrentProduct({ ...currentProduct, departmentId: selected?.value || "", teamId: "", designationId: "" })
              }
              placeholder={isDepartmentsLoading ? "Loading..." : "Select Department"}
              isClearable
              isLoading={isDepartmentsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Team
            </label>
            <Select
              options={teamOptions}
              value={teamOptions.find((o) => o.value === (currentProduct?.teamId || "")) || null}
              onChange={(selected) =>
                setCurrentProduct({ ...currentProduct, teamId: selected?.value || "" })
              }
              placeholder={isTeamsLoading ? "Loading..." : "Select Team"}
              isClearable
              isLoading={isTeamsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Designation
            </label>
            <Select
              options={getDesignationOptions(currentProduct?.departmentId)}
              value={designationOptions.find((o) => o.value === (currentProduct?.designationId || "")) || null}
              onChange={(selected) =>
                setCurrentProduct({ ...currentProduct, designationId: selected?.value || "" })
              }
              placeholder={isDesignationsLoading ? "Loading..." : "Select Designation"}
              isClearable
              isLoading={isDesignationsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <EmployeeStatusSelect
            value={currentProduct?.status || ""}
            onChange={(status) =>
              setCurrentProduct({
                ...currentProduct,
                status,
              })
            }
          />

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Internal Note
            </label>
            <textarea
              value={currentProduct?.note || ""}
              onChange={(e) =>
                setCurrentProduct({ ...currentProduct, note: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={4}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleModalClose}
            className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProduct}
            className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
          >
            Apply Changes
          </button>
        </div>
      </Modal>

      {/* Delete/Status Request Modal */}
      <Modal
        isOpen={isModalOpen2}
        onClose={handleModalClose2}
        title="Action Request / Note Update"
      >
        <div className="space-y-5">
          {role === "superAdmin" ? (
            <EmployeeStatusSelect
              value={currentProduct?.status || ""}
              onChange={(status) =>
                setCurrentProduct({
                  ...currentProduct,
                  status,
                })
              }
            />
          ) : (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                Request Justification / Note
              </label>
              <textarea
                value={currentProduct?.note || ""}
                onChange={(e) =>
                  setCurrentProduct({ ...currentProduct, note: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                rows={4}
                placeholder="Reason for deletion request or updated notes..."
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleModalClose2}
            className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProduct1}
            className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
          >
            Submit Request
          </button>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen1}
        onClose={handleModalClose1}
        title="Add Employee Salary"
      >
        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-5">
          {/* <Field
            label="Purchase Date"
            type="date"
            value={createProduct.date}
            onChange={(v) => setCreateProduct({ ...createProduct, date: v })}
            required
          /> */}

          <Field
            label="Employee Name"
            value={createProduct.name}
            onChange={(v) => setCreateProduct({ ...createProduct, name: v })}
            required
            placeholder="Enter employee name"
          />
          <Field
            label="Employee Id"
            value={createProduct.employee_id}
            onChange={(v) =>
              setCreateProduct({ ...createProduct, employee_id: v })
            }
            required
            placeholder="Enter employee id"
          />

          <Field
            label="Salary"
            type="number"
            step="0.01"
            value={createProduct.salary}
            onChange={(v) => setCreateProduct({ ...createProduct, salary: v })}
            required
            placeholder="0.00"
          />

          <Field
            label="Joining Date"
            type="date"
            value={createProduct.joiningDate}
            onChange={(v) =>
              setCreateProduct({ ...createProduct, joiningDate: v })
            }
          />

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Department
            </label>
            <Select
              options={departmentOptions}
              value={departmentOptions.find((o) => o.value === createProduct.departmentId) || null}
              onChange={(selected) =>
                setCreateProduct({ ...createProduct, departmentId: selected?.value || "", teamId: "", designationId: "" })
              }
              placeholder={isDepartmentsLoading ? "Loading..." : "Select Department"}
              isClearable
              isLoading={isDepartmentsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Team
            </label>
            <Select
              options={teamOptions}
              value={teamOptions.find((o) => o.value === createProduct.teamId) || null}
              onChange={(selected) =>
                setCreateProduct({ ...createProduct, teamId: selected?.value || "" })
              }
              placeholder={isTeamsLoading ? "Loading..." : "Select Team"}
              isClearable
              isLoading={isTeamsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Designation
            </label>
            <Select
              options={getDesignationOptions(createProduct.departmentId)}
              value={designationOptions.find((o) => o.value === createProduct.designationId) || null}
              onChange={(selected) =>
                setCreateProduct({ ...createProduct, designationId: selected?.value || "" })
              }
              placeholder={isDesignationsLoading ? "Loading..." : "Select Designation"}
              isClearable
              isLoading={isDesignationsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
              Additional Note
            </label>
            <textarea
              value={createProduct.note}
              onChange={(v) =>
                setCreateProduct({ ...createProduct, note: v.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
              placeholder="Vendor details or serial numbers..."
            />
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose1}
              className="px-6 py-2.5 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-xl shadow-indigo-100"
            >
              Create Record
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  step,
  readOnly,
  required,
  placeholder,
}) => (
  <div>
    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
      {label}
    </label>
    <input
      type={type}
      step={step}
      value={value ?? ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      required={required}
      placeholder={placeholder}
      className={`h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition ${
        readOnly ? "opacity-70 cursor-not-allowed" : ""
      }`}
    />
  </div>
);

const EmployeeStatusSelect = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
      Status
    </label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
      required
    >
      <option value="">Select Status</option>
      <option value="Active">Active</option>
      <option value="Deactive">Deactive</option>
    </select>
  </div>
);

export default EmployeeListTable;
