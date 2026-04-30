import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  Calculator,
  Plus,
  Trash2,
  Edit2,
  Save,
  DollarSign,
  UserCheck,
  Loader2,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// 1. Khởi tạo Firebase Cloud Database bằng cấu hình của bạn
const firebaseConfig = {
  apiKey: "AIzaSyCcX3q-mnkdyO5Hi_baABWGUmNX4iTx_VU",
  authDomain: "lop-cua-be-luong.firebaseapp.com",
  projectId: "lop-cua-be-luong",
  storageBucket: "lop-cua-be-luong.firebasestorage.app",
  messagingSenderId: "251775166759",
  appId: "1:251775166759:web:8f530251d56d66d42c2102",
  measurementId: "G-6CTR3B6242",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  // Trạng thái cho đồng bộ đám mây
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Quản lý Đăng nhập Ẩn danh (Tự động)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Lỗi xác thực Firebase:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Tải và đồng bộ dữ liệu theo thời gian thực (Real-time Sync)
  useEffect(() => {
    if (!user) return; // Chỉ tải dữ liệu khi đã có user

    // Đường dẫn lưu trữ: users / {ID_Cua_Luong} / students
    const studentsRef = collection(db, "users", user.uid, "students");
    const recordsRef = collection(db, "users", user.uid, "records");

    // Lắng nghe dữ liệu Học Sinh
    const unsubStudents = onSnapshot(
      studentsRef,
      (snapshot) => {
        const data = [];
        snapshot.forEach((d) => data.push(d.data()));
        setStudents(data);
      },
      (error) => console.error("Lỗi tải danh sách học sinh:", error)
    );

    // Lắng nghe dữ liệu Điểm Danh
    const unsubRecords = onSnapshot(
      recordsRef,
      (snapshot) => {
        const data = [];
        snapshot.forEach((d) => data.push(d.data()));
        setRecords(data);
        setIsLoading(false); // Hoàn thành tải dữ liệu
      },
      (error) => {
        console.error("Lỗi tải bản ghi điểm danh:", error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, [user]);

  // 4. Các hàm tương tác với Firestore
  const handleSaveStudent = async (studentData) => {
    if (!user) return;
    const id = studentData.id
      ? studentData.id.toString()
      : Date.now().toString();
    await setDoc(doc(db, "users", user.uid, "students", id), {
      ...studentData,
      id: Number(id),
    });
  };

  const handleDeleteStudent = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "students", id.toString()));
  };

  const handleSaveAttendanceRecord = async (date, attendanceForm) => {
    if (!user) return;
    const existingRecords = records.filter((r) => r.date === date);

    for (const [studentIdStr, hours] of Object.entries(attendanceForm)) {
      const studentId = Number(studentIdStr);
      const existingRecord = existingRecords.find(
        (r) => r.studentId === studentId
      );

      if (hours > 0) {
        const id = existingRecord
          ? existingRecord.id.toString()
          : Date.now().toString() + Math.random().toString().slice(2, 6);
        await setDoc(doc(db, "users", user.uid, "records", id), {
          id: Number(id),
          studentId,
          date,
          hours: Number(hours),
        });
      } else if (existingRecord) {
        await deleteDoc(
          doc(db, "users", user.uid, "records", existingRecord.id.toString())
        );
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-indigo-600">
        <Loader2 className="animate-spin" size={48} />
        <p className="font-medium text-slate-600">Đang kết nối đám mây...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-indigo-900 text-white shadow-xl flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-white text-indigo-900 p-1.5 rounded-lg">
              <UserCheck size={24} />
            </span>
            Lớp Của Lương
          </h1>
          <p className="text-indigo-200 text-sm mt-2">
            Quản lý điểm danh & học phí
          </p>
        </div>

        <nav className="flex-1 mt-6">
          <button
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
              activeTab === "students"
                ? "bg-indigo-800 border-l-4 border-indigo-400"
                : "hover:bg-indigo-800/50 border-l-4 border-transparent"
            }`}
          >
            <Users size={20} />
            <span className="font-medium">Học sinh & Phụ huynh</span>
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
              activeTab === "attendance"
                ? "bg-indigo-800 border-l-4 border-indigo-400"
                : "hover:bg-indigo-800/50 border-l-4 border-transparent"
            }`}
          >
            <CalendarCheck size={20} />
            <span className="font-medium">Điểm danh</span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
              activeTab === "billing"
                ? "bg-indigo-800 border-l-4 border-indigo-400"
                : "hover:bg-indigo-800/50 border-l-4 border-transparent"
            }`}
          >
            <Calculator size={20} />
            <span className="font-medium">Thống kê & Tính tiền</span>
          </button>
        </nav>
      </div>

      {/* Mobile Navigation (Bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around z-50">
        <button
          onClick={() => setActiveTab("students")}
          className={`p-4 flex flex-col items-center gap-1 ${
            activeTab === "students" ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          <Users size={24} />
          <span className="text-xs font-medium">Học sinh</span>
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`p-4 flex flex-col items-center gap-1 ${
            activeTab === "attendance" ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          <CalendarCheck size={24} />
          <span className="text-xs font-medium">Điểm danh</span>
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`p-4 flex flex-col items-center gap-1 ${
            activeTab === "billing" ? "text-indigo-600" : "text-slate-500"
          }`}
        >
          <Calculator size={24} />
          <span className="text-xs font-medium">Tính tiền</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
        {activeTab === "students" && (
          <StudentsManager
            students={students}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            formatCurrency={formatCurrency}
          />
        )}
        {activeTab === "attendance" && (
          <AttendanceManager
            students={students}
            records={records}
            onSaveAttendanceRecord={handleSaveAttendanceRecord}
          />
        )}
        {activeTab === "billing" && (
          <BillingManager
            students={students}
            records={records}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// CÁC COMPONENTS CHỨC NĂNG
// ==========================================

function StudentsManager({
  students,
  onSaveStudent,
  onDeleteStudent,
  formatCurrency,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudent, setCurrentStudent] = useState({
    name: "",
    parentName: "",
    phone: "",
    hourlyRate: 100000,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    await onSaveStudent(currentStudent);
    setIsEditing(false);
    setCurrentStudent({
      name: "",
      parentName: "",
      phone: "",
      hourlyRate: 100000,
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa học sinh này không?")) {
      await onDeleteStudent(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          Danh sách Học sinh
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> Thêm học sinh
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8 animation-fade-in">
          <h3 className="text-lg font-bold mb-4">
            {currentStudent.id ? "Sửa thông tin" : "Thêm học sinh mới"}
          </h3>
          <form
            onSubmit={handleSave}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Tên học sinh *
              </label>
              <input
                required
                type="text"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentStudent.name}
                onChange={(e) =>
                  setCurrentStudent({ ...currentStudent, name: e.target.value })
                }
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Tên phụ huynh
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentStudent.parentName}
                onChange={(e) =>
                  setCurrentStudent({
                    ...currentStudent,
                    parentName: e.target.value,
                  })
                }
                placeholder="Nguyễn Văn B"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentStudent.phone}
                onChange={(e) =>
                  setCurrentStudent({
                    ...currentStudent,
                    phone: e.target.value,
                  })
                }
                placeholder="09xxxx..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Tiền học / 1 giờ (VNĐ) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1000"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={currentStudent.hourlyRate}
                onChange={(e) =>
                  setCurrentStudent({
                    ...currentStudent,
                    hourlyRate: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentStudent({
                    name: "",
                    parentName: "",
                    phone: "",
                    hourlyRate: 100000,
                  });
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} /> Lưu thông tin
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Học sinh</th>
                <th className="p-4 font-semibold text-slate-600">Phụ huynh</th>
                <th className="p-4 font-semibold text-slate-600">SĐT</th>
                <th className="p-4 font-semibold text-slate-600">
                  Mức phí/giờ
                </th>
                <th className="p-4 font-semibold text-slate-600 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Chưa có dữ liệu học sinh.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-medium text-slate-800">{s.name}</td>
                    <td className="p-4 text-slate-600">
                      {s.parentName || "-"}
                    </td>
                    <td className="p-4 text-slate-600">{s.phone || "-"}</td>
                    <td className="p-4 text-indigo-600 font-medium">
                      {formatCurrency(s.hourlyRate)}
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setCurrentStudent(s);
                          setIsEditing(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendanceManager({ students, records, onSaveAttendanceRecord }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceForm, setAttendanceForm] = useState({});
  const [toastMessage, setToastMessage] = useState("");

  useMemo(() => {
    const todayRecords = records.filter((r) => r.date === selectedDate);
    const formState = {};
    students.forEach((s) => {
      const record = todayRecords.find((r) => r.studentId === s.id);
      formState[s.id] = record ? record.hours : 0;
    });
    setAttendanceForm(formState);
  }, [selectedDate, records, students]);

  const handleHoursChange = (studentId, hours) => {
    setAttendanceForm({ ...attendanceForm, [studentId]: Number(hours) });
  };

  const handleSaveAttendance = async () => {
    await onSaveAttendanceRecord(selectedDate, attendanceForm);
    showToast("Đã đồng bộ điểm danh thành công!");
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      {toastMessage && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-bounce z-50">
          <CalendarCheck size={18} /> {toastMessage}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Điểm danh ngày học
        </h2>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-sm font-medium text-slate-600 px-2">
            Chọn ngày:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none bg-slate-50 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {students.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            Chưa có học sinh nào. Vui lòng thêm học sinh trước.
          </p>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {student.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Mức: {student.hourlyRate.toLocaleString("vi-VN")}đ/h
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <label className="text-sm font-medium text-slate-600">
                      Số giờ học:
                    </label>
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() =>
                          handleHoursChange(
                            student.id,
                            Math.max(0, (attendanceForm[student.id] || 0) - 0.5)
                          )
                        }
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="w-16 text-center py-1.5 outline-none font-semibold text-indigo-700"
                        value={attendanceForm[student.id] || 0}
                        onChange={(e) =>
                          handleHoursChange(student.id, e.target.value)
                        }
                      />
                      <button
                        onClick={() =>
                          handleHoursChange(
                            student.id,
                            (attendanceForm[student.id] || 0) + 0.5
                          )
                        }
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleSaveAttendance}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-md"
              >
                <Save size={20} /> Lưu điểm danh ngày{" "}
                {selectedDate.split("-").reverse().join("/")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BillingManager({ students, records, formatCurrency }) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const reportData = useMemo(() => {
    const data = students.map((student) => {
      const studentRecords = records.filter(
        (r) => r.studentId === student.id && r.date.startsWith(selectedMonth)
      );
      const totalHours = studentRecords.reduce(
        (sum, record) => sum + record.hours,
        0
      );
      const totalAmount = totalHours * student.hourlyRate;

      return {
        ...student,
        totalHours,
        totalAmount,
        details: studentRecords,
      };
    });

    return data.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, records, selectedMonth]);

  const grandTotal = reportData.reduce(
    (sum, item) => sum + item.totalAmount,
    0
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Bảng Tính Tiền Học
        </h2>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-sm font-medium text-slate-600 px-2">
            Chọn tháng:
          </span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none bg-slate-50 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-indigo-700"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg p-6 mb-8 text-white flex items-center justify-between">
        <div>
          <p className="text-indigo-100 font-medium mb-1">
            Tổng doanh thu dự kiến tháng {selectedMonth.split("-")[1]}/
            {selectedMonth.split("-")[0]}
          </p>
          <p className="text-3xl md:text-4xl font-bold">
            {formatCurrency(grandTotal)}
          </p>
        </div>
        <div className="hidden sm:block opacity-80">
          <DollarSign size={64} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Học sinh</th>
                <th className="p-4 font-semibold text-slate-600">
                  Phụ huynh (SĐT)
                </th>
                <th className="p-4 font-semibold text-slate-600 text-center">
                  Tổng giờ học
                </th>
                <th className="p-4 font-semibold text-slate-600 text-right">
                  Mức phí/giờ
                </th>
                <th className="p-4 font-semibold text-slate-800 text-right text-lg">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Chưa có dữ liệu.
                  </td>
                </tr>
              ) : (
                reportData.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-medium text-slate-800">
                      {row.name}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div>{row.parentName || "Không có tên"}</div>
                      <div className="text-xs text-slate-400">
                        {row.phone || "Không có SĐT"}
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700">
                      <span className="bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full">
                        {row.totalHours} h
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-500">
                      {formatCurrency(row.hourlyRate)}
                    </td>
                    <td className="p-4 text-right font-bold text-red-600 text-lg">
                      {formatCurrency(row.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-500 text-center md:text-right flex items-center justify-center md:justify-end gap-2">
        <Calculator size={16} /> Phần mềm tự động tính: (Tổng giờ học) x (Mức
        phí 1 giờ)
      </div>
    </div>
  );
}
