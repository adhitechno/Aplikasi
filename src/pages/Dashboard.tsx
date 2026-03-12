import { useEffect, useState } from 'react';
import { Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    present: 0,
    permitted: 0,
    absent: 0,
    recentScans: [] as any[]
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { name: 'Total Siswa', value: stats.totalStudents, icon: Users, color: 'bg-blue-500' },
    { name: 'Hadir', value: stats.present, icon: CheckCircle, color: 'bg-green-500' },
    { name: 'Izin', value: stats.permitted, icon: AlertCircle, color: 'bg-yellow-500' },
    { name: 'Alpa', value: stats.absent, icon: XCircle, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className={`h-6 w-6 text-white p-1 rounded-md ${item.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Scan Terakhir Hari Ini</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Masuk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Pulang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentScans.map((scan) => (
                <tr key={scan.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={scan.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${scan.name}`} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{scan.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scan.class_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scan.time_in || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scan.time_out || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {scan.status}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.recentScans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Belum ada data scan hari ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
