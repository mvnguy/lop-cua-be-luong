import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, CalendarCheck, Calculator, Plus, Trash2, Edit2, Save, DollarSign, UserCheck, Loader2, CheckCircle2, Circle, FileText, X } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// 1. Cấu hình Firebase
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

// ==========================================
// THÔNG TIN NGÂN HÀNG CỦA LƯƠNG (SỬA Ở ĐÂY)
// ==========================================
const BANK_ID = "MB"; // Ví dụ: MB, VCB, TCB, ACB, VPB, TPB...
const ACCOUNT_NO = "0123456789"; // Số tài khoản ngân hàng
const ACCOUNT_NAME = "DAO THI BAO LUONG"; // Tên chủ tài khoản (Không dấu)
// ==========================================

export default function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Xác thực ẩn danh (Để vượt qua rào cản bảo mật Firebase)
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (error) { console.error("Lỗi xác thực:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Tải dữ liệu Real-time (Sử dụng thư mục chung cho TẤT CẢ thiết bị)
  useEffect(() => {
    if (!user) return;
    
    // Đã thay đổi đường dẫn từ 'users/user.uid/...' sang 'shared_data/lop_luong/...'
    const unsubStudents = onSnapshot(collection(db, 'shared_data', 'lop_luong', 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(d => d.data()));
    });
    const unsubRecords = onSnapshot(collection(db, 'shared_data', 'lop_luong', 'records'), (snapshot) => {
      setRecords(snapshot.docs.map(d => d.data()));
      setIsLoading(false);
    });
    
    return () => { unsubStudents(); unsubRecords(); };
  }, [user]);

  // Các hàm tương tác Database (Lưu vào chung 1 thư mục)
  const handleSaveStudent = async (data) => {
    if (!user) return;
    const id = data.id ? data.id.toString() : Date.now().toString();
    await setDoc(doc(db, 'shared_data', 'lop_luong', 'students', id), { ...data, id: Number(id) });
  };

  const handleDeleteStudent = async (id) => {
    if (!user) return;
    if(window.confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
      await deleteDoc(doc(db, 'shared_data', 'lop_luong', 'students', id.toString()));
    }
  };

  const handleToggleAttendance = async (date, studentId) => {
    if (!user) return;
    const existingRecord = records.find(r => r.date === date && r.studentId === studentId);
    
    if (existingRecord) {
      await deleteDoc(doc(db, 'shared_data', 'lop_luong', 'records', existingRecord.id.toString()));
    } else {
      const id = Date.now().toString();
      await setDoc(doc(db, 'shared_data', 'lop_luong', 'records', id), {
        id: Number(id), studentId, date, sessions: 1
      });
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row">
      <div className="w-64 bg-indigo-900 text-white p-6 hidden md:flex flex-col shadow-xl">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-8"><UserCheck /> Lớp Của Lương</h1>
        <nav className="space-y-2">
          <TabBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<CalendarCheck size={20}/>} label="Điểm danh" />
          <TabBtn active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={<Calculator size={20}/>} label="Tính tiền" />
          <TabBtn active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={20}/>} label="Học sinh" />
        </nav>
      </div>

      <div className="flex-1 p-4 md:p-8 pb-24 h-screen overflow-y-auto">
        {activeTab === 'students' && <StudentsView students={students} onSave={handleSaveStudent} onDelete={handleDeleteStudent} format={formatCurrency} />}
        {activeTab === 'attendance' && <AttendanceView students={students} records={records} onToggle={handleToggleAttendance} />}
        {activeTab === 'billing' && <BillingView students={students} records={records} format={formatCurrency} />}
      </div>

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

// ------------------------------------------
// VIEW HỌC SINH
// ------------------------------------------
function StudentsView({ students, onSave, onDelete, format }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', sessionRate: 100000, parentName: '', phone: '' });

  const handleEdit = (student) => {
    setForm({
      id: student.id,
      name: student.name,
      sessionRate: student.sessionRate || student.hourlyRate || 0, 
      parentName: student.parentName || '',
      phone: student.phone || ''
    });
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setForm({ name: '', sessionRate: 100000, parentName: '', phone: '' });
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Học sinh</h2>
        <button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={18}/> Thêm học sinh</button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8">
          <h3 className="text-lg font-bold mb-4">{form.id ? 'Sửa thông tin học sinh' : 'Thêm học sinh mới'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên học sinh *</label>
              <input required placeholder="Nguyễn Văn A" className="w-full border p-2 rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Học phí / buổi (VNĐ) *</label>
              <input type="number" step="10000" className="w-full border p-2 rounded-lg" value={form.sessionRate} onChange={e => setForm({...form, sessionRate: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên phụ huynh</label>
              <input placeholder="Phụ huynh..." className="w-full border p-2 rounded-lg" value={form.parentName} onChange={e => setForm({...form, parentName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
              <input placeholder="09xx..." className="w-full border p-2 rounded-lg" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-lg">Hủy</button>
            <button onClick={() => { if(!form.name) return alert("Nhập tên!"); onSave(form); setIsFormOpen(false); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Save size={18}/> Lưu</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {students.length === 0 ? <p className="p-8 text-center text-slate-500">Chưa có dữ liệu.</p> : (
          <div className="divide-y">
            {students.map(s => (
              <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div>
                  <p className="font-bold text-lg">{s.name}</p>
                  <p className="text-sm text-slate-500">Học phí: <span className="font-medium text-indigo-600">{format(s.sessionRate || s.hourlyRate || 0)}/buổi</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(s)} className="text-blue-500 p-2 bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                  <button onClick={() => onDelete(s.id)} className="text-red-500 p-2 bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------
// VIEW ĐIỂM DANH
// ------------------------------------------
function AttendanceView({ students, records, onToggle }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Điểm danh ngày</h2>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white px-3 py-2 rounded-lg shadow-sm font-semibold outline-none text-indigo-700 border" />
      </div>

      <div className="space-y-3">
        {students.map(s => {
          const isPresent = records.some(r => r.date === date && r.studentId === s.id);
          return (
            <button key={s.id} onClick={() => onToggle(date, s.id)} 
              className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${isPresent ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200'}`}>
              <span className={`text-lg font-bold ${isPresent ? 'text-indigo-900' : 'text-slate-700'}`}>{s.name}</span>
              {isPresent ? <CheckCircle2 className="text-indigo-600" size={24} /> : <Circle className="text-slate-300" size={24} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------
// VIEW TÍNH TIỀN & XUẤT PHIẾU
// ------------------------------------------
function BillingView({ students, records, format }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [receiptData, setReceiptData] = useState(null); 
  
  const report = useMemo(() => {
    return students.map(s => {
      const monthlyRecords = records.filter(r => r.studentId === s.id && r.date.startsWith(month));
      const datesAttended = monthlyRecords.map(r => r.date.split('-').reverse().slice(0,2).join('/')).sort();
      const sessions = monthlyRecords.length;
      const sessionRate = s.sessionRate || s.hourlyRate || 0; 
      const totalAmount = sessions * sessionRate;

      return { ...s, sessions, sessionRate, totalAmount, datesAttended };
    }).filter(s => s.sessions > 0).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [students, records, month]);

  const grandTotal = report.reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <div className="max-w-5xl mx-auto">
      {receiptData && (
        <ReceiptModal 
          data={receiptData} 
          month={month} 
          format={format} 
          onClose={() => setReceiptData(null)} 
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Thống kê học phí</h2>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-white px-3 py-2 rounded-lg shadow-sm font-semibold text-indigo-700 border" />
      </div>

      <div className="bg-indigo-700 text-white p-6 rounded-2xl mb-8 flex justify-between items-center shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium mb-1">TỔNG THU THÁNG {month.split('-')[1]}/{month.split('-')[0]}</p>
          <p className="text-4xl font-bold">{format(grandTotal)}</p>
        </div>
        <DollarSign size={80} className="absolute right-4 opacity-10" />
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 text-slate-600">Học sinh</th>
              <th className="p-4 text-slate-600 text-center">Số buổi</th>
              <th className="p-4 text-slate-800 text-right">Thành tiền</th>
              <th className="p-4 text-slate-600 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">Chưa có dữ liệu.</td></tr>
            ) : (
              report.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-lg">{r.name}</td>
                  <td className="p-4 text-center font-medium text-slate-600">{r.sessions}</td>
                  <td className="p-4 text-right font-bold text-red-600">{format(r.totalAmount)}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setReceiptData(r)}
                      className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      <FileText size={16} /> Xuất phiếu
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------------------
// MODAL TẠO & HIỂN THỊ PHIẾU HỌC PHÍ
// ------------------------------------------
function ReceiptModal({ data, month, format, onClose }) {
  const [step, setStep] = useState(1);
  const [feedback, setFeedback] = useState('');
  
  const qrMessage = `Hoc phi thang ${month.split('-')[1]} cua ${data.name}`;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${data.totalAmount}&addInfo=${encodeURIComponent(qrMessage)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-sm relative shadow-2xl flex flex-col max-h-[95vh]">
        <button onClick={onClose} className="absolute -top-12 right-0 text-white p-2 bg-black/40 rounded-full hover:bg-black/60">
          <X size={24} />
        </button>

        {step === 1 ? (
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-800">Soạn phiếu cho {data.name}</h3>
            <label className="block text-sm font-medium text-slate-600 mb-2">Nhận xét của cô giáo (Tùy chọn):</label>
            <textarea 
              className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-32 mb-4"
              placeholder="Ví dụ: Con học tốt, ngoan, nhớ từ vựng nhanh..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            ></textarea>
            <button 
              onClick={() => setStep(2)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Xem trước Phiếu Học Phí
            </button>
          </div>
        ) : (
          <div className="flex flex-col bg-slate-100 overflow-y-auto rounded-2xl pb-4">
            <div className="p-4 text-center text-sm font-medium text-slate-500 bg-slate-100 flex items-center justify-center gap-2">
              📸 Hãy chụp màn hình phiếu này để gửi Phụ Huynh
            </div>
            
            <div id="receipt-capture-area" className="bg-white mx-4 mt-2 rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
              <div className="bg-[#6EB6A6] text-white text-center py-5 px-4">
                <p className="text-xs font-semibold tracking-widest mb-1 opacity-90">🌈 LỚP CỦA CÔ LƯƠNG 🌈</p>
                <h2 className="text-2xl font-black uppercase tracking-wider mb-1">Phiếu Học Phí</h2>
                <p className="text-sm font-medium">Tháng {month.split('-')[1]}/{month.split('-')[0]}</p>
              </div>

              <div className="p-5">
                <div className="space-y-3 mb-5 border-b border-dashed border-slate-300 pb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium flex items-center gap-2">🧸 Học sinh</span>
                    <span className="font-bold text-slate-800 text-lg">{data.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium flex items-center gap-2">💎 Học phí / buổi</span>
                    <span className="font-semibold text-slate-800">{format(data.sessionRate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium flex items-center gap-2">📝 Số buổi học</span>
                    <span className="font-semibold text-slate-800">{data.sessions} buổi</span>
                  </div>
                </div>

                <div className="bg-[#F2F9F8] border border-[#BCE0D8] rounded-xl p-4 text-center mb-5">
                  <p className="text-[#4A8F80] font-bold text-sm mb-1 uppercase tracking-wide">Tổng Học Phí</p>
                  <p className="text-[#326B5E] text-3xl font-black">{format(data.totalAmount)}</p>
                </div>

                <div className="mb-5">
                  <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ngày đi học</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {data.datesAttended.map(d => (
                      <span key={d} className="bg-[#EDF6F5] text-[#4A8F80] border border-[#D1EAE5] px-2 py-1 rounded text-xs font-semibold">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-slate-700 relative">
                    <p className="text-center text-xs font-bold text-amber-600/70 uppercase mb-2">--- Nhận xét ---</p>
                    <p className="whitespace-pre-line leading-relaxed">{feedback}</p>
                  </div>
                )}

                <div className="border border-[#D1EAE5] border-dashed rounded-xl p-4 flex flex-col items-center">
                  <p className="text-xs font-bold text-[#4A8F80] uppercase tracking-widest mb-2">Mã Thanh Toán</p>
                  <img src={qrUrl} alt="QR Code" className="w-48 h-48 object-contain rounded-lg" />
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Quét mã bằng ứng dụng Ngân hàng<br/>hoặc Zalo/Momo</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 pt-2">
              <button onClick={() => setStep(1)} className="w-full text-slate-500 font-medium py-2 hover:bg-slate-200 rounded-lg transition-colors">
                Quay lại sửa nhận xét
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}