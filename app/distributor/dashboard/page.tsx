"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DistributorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [allotments, setAllotments] = useState<any[]>([]);
  const [isLoadingAllotments, setIsLoadingAllotments] = useState(true);
  const [updatingAllotmentId, setUpdatingAllotmentId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== "distributor") {
      router.push("/");
      return;
    }

    setUser(parsedUser);
    fetchAllotments(token);
  }, [router]);

  const fetchAllotments = async (token: string) => {
    try {
      const response = await fetch("/api/allotments/my-allotments", {
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

  const handleMarkAsCollected = async (allotmentId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setUpdatingAllotmentId(allotmentId);

    try {
      const response = await fetch(`/api/allotments/${allotmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "collected" }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the local state
        setAllotments((prev) =>
          prev.map((allot) =>
            allot.id === allotmentId
              ? { ...allot, status: "collected" }
              : allot
          )
        );
      } else {
        alert(data.message || "Failed to update allotment");
      }
    } catch (error) {
      console.error("Failed to mark as collected:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setUpdatingAllotmentId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
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
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="bg-secondary text-white px-3 py-1 rounded-full text-sm font-medium">
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-primary text-white rounded-xl shadow-lg p-6">
            <h3 className="text-sm opacity-90 mb-2">Total Allotments</h3>
            <p className="text-4xl font-bold">{allotments.length}</p>
          </div>
          <div className="bg-secondary text-white rounded-xl shadow-lg p-6">
            <h3 className="text-sm opacity-90 mb-2">Pending</h3>
            <p className="text-4xl font-bold">
              {allotments.filter((a) => a.status === 'pending').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Allotment History</h2>

          {isLoadingAllotments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading allotments...</p>
            </div>
          ) : allotments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-base font-medium">No allotments yet</p>
              <p className="text-sm mt-2 opacity-75">Your product allotments will appear here</p>
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
                        Allotted by: {allotment.allottedBy.name}
                      </p>
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
                      <p className="text-xs text-gray-600">Quantity</p>
                      <p className="text-2xl font-bold text-primary">{allotment.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(allotment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {allotment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{allotment.notes}</p>
                    </div>
                  )}

                  {allotment.status === 'pending' && (
                    <div className="mt-4">
                      <button
                        onClick={() => handleMarkAsCollected(allotment.id)}
                        disabled={updatingAllotmentId === allotment.id}
                        className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                      >
                        {updatingAllotmentId === allotment.id
                          ? "Updating..."
                          : "Mark as Collected"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          <button
            className="flex-1 flex flex-col items-center py-3 px-2 transition text-primary"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => router.push("/distributor/distributions")}
            className="flex-1 flex flex-col items-center py-3 px-2 transition text-gray-500 hover:text-primary"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">Distributions</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
