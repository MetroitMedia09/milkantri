"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DistributorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [allotments, setAllotments] = useState<any[]>([]);
  const [isLoadingAllotments, setIsLoadingAllotments] = useState(true);

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
      {/* Header */}
      <header className="bg-white shadow-sm">
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

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
