import React, { useState, useMemo, useEffect } from 'react';
import { Users, CalendarCheck, Calculator, Plus, Trash2, Save, DollarSign, UserCheck, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// 1. Cấu hình Firebase của bạn
const firebaseConfig = {
  apiKey: "AIzaSyCcX3q-mnkdyO5Hi_baABWGUmNX4iTx_VU",
  authDomain: "lop-cua-be-luong.firebaseapp.com",
  projectId: "lop-cua-be-luong",
  storageBucket: "lop-cua-be-luong.firebasestorage.app",
  messagingSenderId: "251775166759",
  appId: "1:251775166759:web:8f530251d56d66d42c2102",
  measurementId: "G-6CTR3B6242"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Xác thực ẩn danh
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

  // 3. Tải dữ liệu Real-time
  useEffect(() => {
    if (!user) return;
    
    const studentsRef = collection(db, 'users', user.uid, 'students');
    const recordsRef = collection(db, 'users', user.uid, 'records');

    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      const data = [];
      snapshot.forEach(d => data.push(d.data()));
      setStudents(data);
    }, (error) => console.error("Lỗi tải danh sách học sinh:", error));

    const unsubRecords = onSnapshot(recordsRef, (snapshot) => {
      const data = [];
      snapshot.forEach(d => data.push(d.data()));
      setRecords(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Lỗi tải bản ghi điểm danh:", error);
      setIsLoading(false);
    });

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, [user]);

  // 4. Các hàm tương tác Database
  const handleSaveStudent = async (data) => {
    if (!user) return;
    const id = data.id ? data.id.toString() : Date.now().toString();
    await setDoc(doc(db, 'users', user.uid, 'students', id), {
      ...data,
      id: Number(id)
    });
  };

  const handleDeleteStudent = async (id) => {
    if (!user) return;
    if(window.confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'students', id.toString()));
    }
  };

  // Hàm điểm danh (Toggle: Có mặt / Vắng mặt)
  const handleToggleAttendance = async (date, studentId) => {
    if (!user) return;
    const existingRecord = records.find(r => r.date === date && r.studentId === studentId);
    
    if (existingRecord) {
      // Đã điểm danh -> Bấm để xóa (Hủy điểm danh)
      await deleteDoc(doc(db, 'users', user.uid, 'records', existingRecord.id.toString()));
    } else {
      // Chưa điểm danh -> Bấm để thêm (1 buổi)
      const id = Date.now().toString();
      await setDoc(doc(db, 'users', user.uid, 'records', id), {
        id: Number(id),
        studentId,
        date,
        sessions: 1 // Tính là 1 buổi
      });
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-indigo-600">
        <Loader2 className="animate-spin" size={48} />
        <p className="font-medium text-slate-600">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <div className="w-64 bg-indigo-900 text-white p-6 hidden md:flex flex-col shadow-xl">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-8"><UserCheck /> Lớp Của Lương</h1>
        <nav className="space-y-2">
          <TabBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<CalendarCheck size={20}/>} label="Điểm danh" />
          <TabBtn active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={<Calculator size={20}/>} label="Tính tiền" />
          <TabBtn active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={20}/>} label="Học sinh" />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 pb-24">
        {activeTab === 'students' && <StudentsView students={students} onSave={handleSaveStudent} onDelete={handleDeleteStudent} format={formatCurrency} />}
        {activeTab === 'attendance' && <AttendanceView students={students} records={records} onToggle={handleToggleAttendance} />}
        {activeTab === 'billing' && <BillingView students={students} records={records} format={formatCurrency} />}
      </div>

      {/* Bottom Nav - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 z-50">
        <MobileTab active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<CalendarCheck />} label="Điểm danh" />
        <MobileTab active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={<Calculator />} label="Tính tiền" />
        <MobileTab active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users />} label="Học sinh" />
      </div>
    </div>
  );
}

// ==========================================
// CÁC COMPONENTS CHỨC NĂNG
// ==========================================

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-indigo-700 border-l-4 border-white font-medium' : 'hover:bg-indigo-800 border-l-4 border-transparent text-indigo-200'}`}>
      {icon} {label}
    </button>
  );
}

function MobileTab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center p-2 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      {icon} <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}

function StudentsView({ students, onSave, onDelete, format }) {
  const [isAdd, setIsAdd] = useState(false);
  const [form, setForm] = useState({ name: '', sessionRate: 100000, parentName: '', phone: '' });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Học sinh</h2>
        <button onClick={() => setIsAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus size={18}/> Thêm học sinh</button>
      </div>

      {isAdd && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8">
          <h3 className="text-lg font-bold mb-4">Thêm học sinh mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tên học sinh *</label>
              <input required placeholder="Nguyễn Văn A" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Học phí / buổi (VNĐ) *</label>
              <input type="number" step="10000" min="0" placeholder="100000" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" value={form.sessionRate} onChange={e => setForm({...form, sessionRate: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tên phụ huynh</label>
              <input placeholder="Nguyễn Văn B" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" value={form.parentName} onChange={e => setForm({...form, parentName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Số điện thoại</label>
              <input placeholder="09xxxx..." className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button onClick={() => setIsAdd(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Hủy</button>
            <button onClick={() => { 
                if(!form.name) return alert("Vui lòng nhập tên học sinh!");
                onSave(form); setIsAdd(false); setForm({name:'', sessionRate:100000, parentName:'', phone:''}); 
              }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Save size={18}/> Lưu học sinh</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {students.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Chưa có dữ liệu học sinh.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map(s => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-slate-50 transition-colors gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{s.name}</p>
                    <p className="text-sm text-slate-500">Học phí: <span className="font-medium text-indigo-600">{format(s.sessionRate)}/buổi</span></p>
                    {(s.parentName || s.phone) && <p className="text-xs text-slate-400 mt-1">PH: {s.parentName} {s.phone ? `- ${s.phone}` : ''}</p>}
                  </div>
                </div>
                <button onClick={() => onDelete(s.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg self-end sm:self-auto transition-colors" title="Xóa học sinh">
                  <Trash2 size={20}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceView({ students, records, onToggle }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Điểm danh theo ngày</h2>
        <div className="bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
          <CalendarCheck size={18} className="text-indigo-600" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-base font-semibold outline-none text-slate-700 bg-transparent" />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-500 mb-4">Bạn cần thêm học sinh trước khi điểm danh.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-2 px-1">Chạm vào tên để đánh dấu CÓ MẶT (tính 1 buổi)</p>
          {students.map(s => {
            const isPresent = records.some(r => r.date === date && r.studentId === s.id);
            return (
              <button key={s.id} onClick={() => onToggle(date, s.id)} 
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 border-2 ${isPresent ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                <div className="flex flex-col items-start">
                  <span className={`text-lg font-bold ${isPresent ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isPresent ? (
                    <span className="text-indigo-600 flex items-center gap-1 font-medium bg-indigo-100 px-3 py-1 rounded-full text-sm">
                      <CheckCircle2 size={18} /> Đã tính 1 buổi
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1 font-medium text-sm">
                      <Circle size={18} /> Vắng
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BillingView({ students, records, format }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Tính toán số buổi và thành tiền
  const report = useMemo(() => {
    const data = students.map(s => {
      // Lọc các bản ghi điểm danh trong tháng của học sinh này
      const monthlyRecords = records.filter(r => r.studentId === s.id && r.date.startsWith(month));
      // Số buổi học = số lượng bản ghi
      const sessions = monthlyRecords.length;
      const sessionRate = s.sessionRate || 0;
      const totalAmount = sessions * sessionRate;

      return { ...s, sessions, sessionRate, totalAmount };
    });
    
    // Sắp xếp: Ai học nhiều tiền nhất lên đầu
    return data.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [students, records, month]);

  const grandTotal = report.reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Thống kê học phí</h2>
        <div className="bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">Chọn tháng:</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="font-semibold outline-none text-indigo-700 bg-transparent" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl mb-8 flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium mb-1 tracking-wide">TỔNG THU THÁNG {month.split('-')[1]}/{month.split('-')[0]}</p>
          <p className="text-4xl sm:text-5xl font-bold tracking-tight">{format(grandTotal)}</p>
        </div>
        <DollarSign size={80} className="absolute right-4 opacity-10 -rotate-12" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Học sinh</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Số buổi học</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Đơn giá / buổi</th>
                <th className="p-4 font-semibold text-slate-800 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {report.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500">Chưa có dữ liệu học sinh.</td></tr>
              ) : (
                report.map(r => (
                  <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${r.sessions === 0 ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 text-lg">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.parentName ? `PH: ${r.parentName}` : ''}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${r.sessions > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.sessions} buổi
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-500 font-medium">
                      {format(r.sessionRate)}
                    </td>
                    <td className="p-4 text-right font-bold text-red-600 text-xl">
                      {format(r.totalAmount)}
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