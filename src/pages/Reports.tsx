import { useEffect, useState } from 'react';
import { Download, MessageCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    month: format(new Date(), 'yyyy-MM'),
    class_id: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClasses = async () => {
    const res = await fetch('/api/classes');
    setClasses(await res.json());
  };

  const fetchReports = async () => {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`/api/reports?${query}`);
    setReports(await res.json());
  };

  useEffect(() => {
    fetchClasses();
    fetchReports();
  }, [filters]);

  const handleExportExcel = () => {
    const data = reports.map(r => ({
      'Tanggal': r.date,
      'NIS': r.nis,
      'Nama Siswa': r.name,
      'Kelas': r.class_name,
      'Jam Masuk': r.time_in || '-',
      'Jam Pulang': r.time_out || '-',
      'Status': r.status,
      'No. WA Ortu': r.parent_phone || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap_Absensi_${filters.month}.xlsx`);
  };

  const handleSendWA = async (report: any) => {
    if (!report.parent_phone) {
      showToast('Nomor WhatsApp orang tua tidak tersedia!', 'error');
      return;
    }

    const message = `Halo Bapak/Ibu,
Berikut adalah laporan absensi ananda *${report.name}* pada tanggal ${report.date}:
- Status: ${report.status.toUpperCase()}
- Jam Masuk: ${report.time_in || '-'}
- Jam Pulang: ${report.time_out || '-'}

Terima kasih,
Sistem Absensi Sekolah`;

    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: report.parent_phone, message })
      });
      const data = await res.json();
      showToast(data.message, data.success ? 'success' : 'error');
    } catch (e) {
      showToast('Gagal mengirim pesan WhatsApp', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white z-50 transition-opacity ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">Rekap Absensi</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
            Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
            <select
              value={filters.class_id}
              onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Siswa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Masuk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pulang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{report.name}</div>
                    <div className="text-sm text-gray-500">{report.nis}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.class_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.time_in || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.time_out || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === 'hadir' ? 'bg-green-100 text-green-800' :
                      report.status === 'izin' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleSendWA(report)}
                      disabled={isSending || !report.parent_phone}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
                        !report.parent_phone ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      Kirim WA
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p>Tidak ada data absensi untuk filter yang dipilih</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
