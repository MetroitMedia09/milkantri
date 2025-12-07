"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; product: any }>({
    isOpen: false,
    product: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "distributors" | "inventory" | "distributions">("dashboard");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

  // Distributor states
  const [distributors, setDistributors] = useState<any[]>([]);
  const [isLoadingDistributors, setIsLoadingDistributors] = useState(true);
  const [distributorModal, setDistributorModal] = useState<{ isOpen: boolean; distributor: any | null; mode: 'add' | 'edit' }>({
    isOpen: false,
    distributor: null,
    mode: 'add',
  });
  const [deleteDistributorModal, setDeleteDistributorModal] = useState<{ isOpen: boolean; distributor: any }>({
    isOpen: false,
    distributor: null,
  });
  const [distributorForm, setDistributorForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
  });
  const [isSavingDistributor, setIsSavingDistributor] = useState(false);
  const [isDeletingDistributor, setIsDeletingDistributor] = useState(false);
  const [distributorError, setDistributorError] = useState('');

  // Allotment states
  const [allotmentModal, setAllotmentModal] = useState<{ isOpen: boolean; product: any | null }>({
    isOpen: false,
    product: null,
  });
  const [allotmentForm, setAllotmentForm] = useState({
    distributorId: '',
    quantity: '',
    notes: '',
  });
  const [isAllotting, setIsAllotting] = useState(false);
  const [allotmentError, setAllotmentError] = useState('');

  // Inventory tracking states
  const [allotments, setAllotments] = useState<any[]>([]);
  const [isLoadingAllotments, setIsLoadingAllotments] = useState(true);
  const [showReportDownloadModal, setShowReportDownloadModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Distributions states
  const [distributions, setDistributions] = useState<any[]>([]);
  const [isLoadingDistributions, setIsLoadingDistributions] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "admin") {
      router.push("/");
      return;
    }

    setUser(parsedUser);
    fetchProducts(token);
    fetchDistributors(token);
    fetchAllotments(token);
    fetchDistributions(token);
  }, [router]);

  const fetchProducts = async (token: string) => {
    try {
      const response = await fetch("/api/products", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchDistributors = async (token: string) => {
    try {
      const response = await fetch("/api/distributors", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setDistributors(data.distributors);
      }
    } catch (error) {
      console.error("Failed to fetch distributors:", error);
    } finally {
      setIsLoadingDistributors(false);
    }
  };

  const fetchAllotments = async (token: string) => {
    try {
      const response = await fetch("/api/allotments", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setAllotments(data.allotments);
      }
    } catch (error) {
      console.error("Failed to fetch allotments:", error);
    } finally {
      setIsLoadingAllotments(false);
    }
  };

  const fetchDistributions = async (token: string) => {
    try {
      const response = await fetch("/api/distributions", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setDistributions(data.distributions);
      }
    } catch (error) {
      console.error("Failed to fetch distributions:", error);
    } finally {
      setIsLoadingDistributions(false);
    }
  };

  const handleDeleteDistribution = async (id: string) => {
    if (!confirm("Are you sure you want to delete this distribution?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/distributions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchDistributions(token!);
      } else {
        alert(data.message || "Failed to delete distribution");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const openDeleteModal = (product: any) => {
    setDeleteModal({ isOpen: true, product });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, product: null });
  };

  const confirmDelete = async () => {
    if (!deleteModal.product) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products/${deleteModal.product.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Refresh products list
        fetchProducts(token!);
        closeDeleteModal();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Distributor management functions
  const openAddDistributorModal = () => {
    setDistributorForm({ name: '', email: '', password: '', phoneNumber: '' });
    setDistributorError('');
    setDistributorModal({ isOpen: true, distributor: null, mode: 'add' });
  };

  const openEditDistributorModal = (distributor: any) => {
    setDistributorForm({
      name: distributor.name,
      email: distributor.email,
      password: '',
      phoneNumber: distributor.phoneNumber || '',
    });
    setDistributorError('');
    setDistributorModal({ isOpen: true, distributor, mode: 'edit' });
  };

  const closeDistributorModal = () => {
    setDistributorModal({ isOpen: false, distributor: null, mode: 'add' });
    setDistributorForm({ name: '', email: '', password: '', phoneNumber: '' });
    setDistributorError('');
  };

  const saveDistributor = async () => {
    if (!distributorForm.name || !distributorForm.email) {
      setDistributorError('Name and email are required');
      return;
    }

    if (distributorModal.mode === 'add' && !distributorForm.password) {
      setDistributorError('Password is required for new distributors');
      return;
    }

    setIsSavingDistributor(true);
    setDistributorError('');

    try {
      const token = localStorage.getItem("token");
      const url = distributorModal.mode === 'add'
        ? '/api/distributors'
        : `/api/distributors/${distributorModal.distributor.id}`;

      const response = await fetch(url, {
        method: distributorModal.mode === 'add' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(distributorForm),
      });

      const data = await response.json();

      if (data.success) {
        fetchDistributors(token!);
        closeDistributorModal();
      } else {
        setDistributorError(data.message || 'Failed to save distributor');
      }
    } catch (error) {
      setDistributorError('An error occurred. Please try again.');
    } finally {
      setIsSavingDistributor(false);
    }
  };

  const openDeleteDistributorModal = (distributor: any) => {
    setDeleteDistributorModal({ isOpen: true, distributor });
  };

  const closeDeleteDistributorModal = () => {
    setDeleteDistributorModal({ isOpen: false, distributor: null });
  };

  const confirmDeleteDistributor = async () => {
    if (!deleteDistributorModal.distributor) return;

    setIsDeletingDistributor(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/distributors/${deleteDistributorModal.distributor.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchDistributors(token!);
        closeDeleteDistributorModal();
      }
    } catch (error) {
      console.error("Delete distributor error:", error);
    } finally {
      setIsDeletingDistributor(false);
    }
  };

  // Allotment functions
  const openAllotmentModal = (product: any) => {
    setAllotmentForm({ distributorId: '', quantity: '', notes: '' });
    setAllotmentError('');
    setAllotmentModal({ isOpen: true, product });
  };

  const closeAllotmentModal = () => {
    setAllotmentModal({ isOpen: false, product: null });
    setAllotmentForm({ distributorId: '', quantity: '', notes: '' });
    setAllotmentError('');
  };

  const handleAllotment = async () => {
    if (!allotmentForm.distributorId || !allotmentForm.quantity) {
      setAllotmentError('Distributor and quantity are required');
      return;
    }

    if (parseInt(allotmentForm.quantity) < 1) {
      setAllotmentError('Quantity must be at least 1');
      return;
    }

    if (allotmentModal.product && parseInt(allotmentForm.quantity) > allotmentModal.product.quantity) {
      setAllotmentError(`Only ${allotmentModal.product.quantity} units available`);
      return;
    }

    setIsAllotting(true);
    setAllotmentError('');

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/allotments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: allotmentModal.product.id,
          distributorId: allotmentForm.distributorId,
          quantity: parseInt(allotmentForm.quantity),
          notes: allotmentForm.notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchProducts(token!);
        fetchAllotments(token!);
        closeAllotmentModal();
      } else {
        setAllotmentError(data.message || 'Failed to allot product');
      }
    } catch (error) {
      setAllotmentError('An error occurred. Please try again.');
    } finally {
      setIsAllotting(false);
    }
  };

  // Reset inventory function
  const handleResetInventory = async () => {
    setIsResetting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/inventory/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        fetchProducts(token!);
        fetchAllotments(token!);
        fetchDistributions(token!);
        setShowResetModal(false);
      }
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setIsResetting(false);
    }
  };

  // Drawer close with animation
  const handleCloseDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setIsDrawerOpen(false);
      setIsDrawerClosing(false);
    }, 300); // Match animation duration
  };

  // PDF Report Generation
  const handleDownloadReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Title
    doc.setFontSize(20);
    doc.text('Daily Inventory Report', 105, 20, { align: 'center' });

    // Date and Time
    doc.setFontSize(10);
    doc.text(`Report Generated: ${dateStr} at ${timeStr}`, 105, 30, { align: 'center' });

    let yPos = 45;

    // Products Summary
    doc.setFontSize(14);
    doc.text('Products Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    products.forEach((product) => {
      const productAllotments = allotments.filter(a => a.product.id === product.id);
      const totalAllotted = productAllotments.reduce((sum, a) => sum + a.quantity, 0);
      const remaining = product.quantity;

      doc.text(`${product.name}:`, 25, yPos);
      doc.text(`Allotted: ${totalAllotted}, Remaining: ${remaining}`, 80, yPos);
      yPos += 7;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    });

    // Allotments Summary
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Allotments Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Total Allotments: ${allotments.length}`, 25, yPos);
    yPos += 7;
    doc.text(`Pending: ${allotments.filter(a => a.status === 'pending').length}`, 25, yPos);
    yPos += 7;
    doc.text(`Collected: ${allotments.filter(a => a.status === 'collected').length}`, 25, yPos);
    yPos += 7;
    doc.text(`Returned: ${allotments.filter(a => a.status === 'returned').length}`, 25, yPos);
    yPos += 10;

    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    // Distributions Summary
    doc.setFontSize(14);
    doc.text('Distributions Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Total Distributions: ${distributions.length}`, 25, yPos);
    yPos += 10;

    if (distributions.length > 0) {
      distributions.forEach((dist) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(`Product: ${dist.product.name}`, 25, yPos);
        yPos += 6;
        doc.text(`Distributor: ${dist.distributor.name}`, 30, yPos);
        yPos += 6;
        doc.text(`To: ${dist.recipientName}, Qty: ${dist.quantity}`, 30, yPos);
        yPos += 8;
      });
    }

    // Save the PDF
    doc.save(`inventory-report-${now.toISOString().split('T')[0]}.pdf`);
    setIsDrawerOpen(false);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - With proper spacing for fixed header and bottom nav */}
      <main className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-primary text-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm opacity-90 mb-2">Total Products</h3>
                <p className="text-4xl font-bold">{products.length}</p>
              </div>
              <div className="bg-secondary text-white rounded-xl shadow-lg p-6">
                <h3 className="text-sm opacity-90 mb-2">Distributors</h3>
                <p className="text-4xl font-bold">{distributors.length}</p>
              </div>
            </div>

            {/* Inventory Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Inventory Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Allotments</p>
                  <p className="text-3xl font-bold text-primary">{allotments.length}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {allotments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Collected</p>
                  <p className="text-3xl font-bold text-green-600">
                    {allotments.filter(a => a.status === 'collected').length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Returned</p>
                  <p className="text-3xl font-bold text-gray-600">
                    {allotments.filter(a => a.status === 'returned').length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Products</h2>

          {isLoadingProducts ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm">No products yet</p>
              <p className="text-xs mt-1">Click "Add Product" to create your first product</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const productAllotments = allotments.filter(a => a.product.id === product.id);
                const totalAllotted = productAllotments.reduce((sum, a) => sum + a.quantity, 0);
                const remaining = product.quantity;

                return (
                  <div
                    key={product.id}
                    className="p-5 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAllotmentModal(product)}
                          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm"
                          title="Allot"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                          className="p-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition shadow-sm"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Allotted</p>
                        <p className="text-2xl font-bold text-orange-600">{totalAllotted}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Remaining</p>
                        <p className="text-2xl font-bold text-green-600">{remaining}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

            {/* Create Product Button */}
            <button
              onClick={() => router.push("/admin/products/create")}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-5 rounded-xl transition duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </>
        )}

        {/* Distributors Tab */}
        {activeTab === "distributors" && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Distributors</h2>

              {isLoadingDistributors ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading distributors...</p>
                </div>
              ) : distributors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm">No distributors yet</p>
                  <p className="text-xs mt-1">Click "Add Distributor" to create your first distributor</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {distributors.map((distributor) => (
                    <div
                      key={distributor.id}
                      className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition border border-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900">{distributor.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{distributor.email}</p>
                        {distributor.phoneNumber && (
                          <p className="text-sm text-gray-500 mt-1">{distributor.phoneNumber}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditDistributorModal(distributor)}
                          className="p-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition shadow-sm"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteDistributorModal(distributor)}
                          className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Distributor Button */}
            <button
              onClick={openAddDistributorModal}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-5 rounded-xl transition duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Distributor
            </button>
          </>
        )}

        {/* Inventory Tracking Tab */}
        {activeTab === "inventory" && (
          <>
            {/* Product Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Product Inventory</h2>
                <button
                  onClick={() => setShowReportDownloadModal(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium"
                >
                  Reset Day
                </button>
              </div>

              {isLoadingProducts || isLoadingAllotments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading inventory...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => {
                    const productAllotments = allotments.filter(a => a.product.id === product.id);
                    const totalAllotted = productAllotments.reduce((sum, a) => sum + a.quantity, 0);
                    const remaining = product.quantity;

                    return (
                      <div key={product.id} className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">{product.name}</h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Allotted</p>
                            <p className="text-2xl font-bold text-orange-600">{totalAllotted}</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Remaining</p>
                            <p className="text-2xl font-bold text-green-600">{remaining}</p>
                          </div>
                        </div>

                        {productAllotments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">Distributors:</p>
                            <div className="space-y-2">
                              {productAllotments.map((allot) => (
                                <div key={allot.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{allot.distributor.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{allot.quantity} units</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      allot.status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : allot.status === 'collected'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {allot.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* All Allotments List */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">All Allotments</h2>

              {isLoadingAllotments ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading allotments...</p>
                </div>
              ) : allotments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No allotments yet</p>
                  <p className="text-xs mt-1">Start allotting products to distributors to track inventory</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allotments.map((allotment) => (
                    <div
                      key={allotment.id}
                      className="p-5 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{allotment.product.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Distributor: {allotment.distributor.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{allotment.distributor.email}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          allotment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : allotment.status === 'collected'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {allotment.status.charAt(0).toUpperCase() + allotment.status.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-600">Quantity Allotted</p>
                          <p className="text-2xl font-bold text-primary">{allotment.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(allotment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Allotted By</p>
                          <p className="text-sm font-medium text-gray-900">{allotment.allottedBy.name}</p>
                        </div>
                      </div>

                      {allotment.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{allotment.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Distributions Tab */}
        {activeTab === "distributions" && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">All Distributions</h2>

              {isLoadingDistributions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading distributions...</p>
                </div>
              ) : distributions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-base font-medium">No distributions yet</p>
                  <p className="text-sm mt-2 opacity-75">Distributors will distribute collected allotments to shopkeepers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {distributions.map((dist) => (
                    <div
                      key={dist.id}
                      className="p-5 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{dist.product.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Distributor: {dist.distributor.name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            To: {dist.recipientName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Quantity</p>
                          <p className="text-2xl font-bold text-primary">{dist.quantity}</p>
                        </div>
                      </div>

                      {dist.notes && (
                        <div className="mb-3 p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{dist.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{new Date(dist.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteDistribution(dist.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 flex flex-col items-center py-3 px-2 transition ${
              activeTab === "dashboard" ? "text-primary" : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 flex flex-col items-center py-3 px-2 transition ${
              activeTab === "inventory" ? "text-primary" : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-xs font-medium">Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex-1 flex flex-col items-center py-3 px-2 transition ${
              activeTab === "products" ? "text-primary" : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs font-medium">Products</span>
          </button>

          <button
            onClick={() => setActiveTab("distributions")}
            className={`flex-1 flex flex-col items-center py-3 px-2 transition ${
              activeTab === "distributions" ? "text-primary" : "text-gray-500"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">Distributions</span>
          </button>
        </div>
      </nav>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete Product
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {deleteModal.product?.name}
              </span>
              ? This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Distributor Modal */}
      {distributorModal.isOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {distributorModal.mode === 'add' ? 'Add Distributor' : 'Edit Distributor'}
            </h3>

            {distributorError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {distributorError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={distributorForm.name}
                  onChange={(e) => setDistributorForm({ ...distributorForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={distributorForm.email}
                  onChange={(e) => setDistributorForm({ ...distributorForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {distributorModal.mode === 'edit' && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={distributorForm.password}
                  onChange={(e) => setDistributorForm({ ...distributorForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                  placeholder={distributorModal.mode === 'add' ? 'Enter password' : 'Leave blank to keep current'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={distributorForm.phoneNumber}
                  onChange={(e) => setDistributorForm({ ...distributorForm, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeDistributorModal}
                disabled={isSavingDistributor}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveDistributor}
                disabled={isSavingDistributor}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDistributor ? 'Saving...' : (distributorModal.mode === 'add' ? 'Add' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Distributor Confirmation Modal */}
      {deleteDistributorModal.isOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete Distributor
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {deleteDistributorModal.distributor?.name}
              </span>
              ? They will no longer be able to login to the system.
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteDistributorModal}
                disabled={isDeletingDistributor}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDistributor}
                disabled={isDeletingDistributor}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingDistributor ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allot Product Modal */}
      {allotmentModal.isOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Allot Product: {allotmentModal.product?.name}
            </h3>

            {allotmentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {allotmentError}
              </div>
            )}

            <div className="space-y-4">
              {/* Distributor Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Distributor
                </label>
                <select
                  value={allotmentForm.distributorId}
                  onChange={(e) => setAllotmentForm({ ...allotmentForm, distributorId: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                >
                  <option value="">Choose a distributor</option>
                  {distributors.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name} ({dist.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (Available: {allotmentModal.product?.quantity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={allotmentModal.product?.quantity}
                  value={allotmentForm.quantity}
                  onChange={(e) => setAllotmentForm({ ...allotmentForm, quantity: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                  placeholder="Enter quantity"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={allotmentForm.notes}
                  onChange={(e) => setAllotmentForm({ ...allotmentForm, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-gray-900"
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeAllotmentModal}
                disabled={isAllotting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAllotment}
                disabled={isAllotting}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAllotting ? 'Allotting...' : 'Allot Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Download Pre-Confirmation Modal */}
      {showReportDownloadModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Before Resetting
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Did you download the daily report? This helps you keep a record before clearing the data.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReportDownloadModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowReportDownloadModal(false);
                  setShowResetModal(true);
                }}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Inventory Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Reset Daily Inventory?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              This will reset all product quantities to 0 and clear all allotments and distributions. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetInventory}
                disabled={isResetting}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? "Resetting..." : "Reset Day"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Menu */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity ${
              isDrawerClosing ? 'animate-fadeOut' : 'animate-fadeIn'
            }`}
            onClick={handleCloseDrawer}
          />

          {/* Drawer */}
          <div className={`fixed top-0 left-0 h-full w-80 bg-white/95 backdrop-blur-xl shadow-2xl z-50 transform transition-all duration-300 ease-out border-r border-white/20 ${
            isDrawerClosing ? 'animate-slideOutLeft' : 'animate-slideInLeft'
          }`}>
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Menu</h2>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-3">
                  {/* Distributors */}
                  <button
                    onClick={() => {
                      setActiveTab("distributors");
                      handleCloseDrawer();
                    }}
                    className="w-full flex items-center gap-4 p-4 text-left text-gray-700 bg-white/50 hover:bg-primary/20 hover:text-primary rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/30"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="font-semibold">Distributors</span>
                  </button>

                  {/* Reports */}
                  <button
                    onClick={handleDownloadReport}
                    className="w-full flex items-center gap-4 p-4 text-left text-gray-700 bg-white/50 hover:bg-primary/20 hover:text-primary rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-100 hover:border-primary/30"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="font-semibold">Download Report</span>
                  </button>
                </nav>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Milk Distribution System v1.0
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
