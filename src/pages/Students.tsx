import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '', rfid_uid: '', nis: '', name: '', class_id: '', parent_phone: '', photo_url: ''
  });

  const fetchStudents = async () => {
    const res = await fetch('/api/students');
    setStudents(await res.json());
  };

  const fetchClasses = async () => {
    const res = await fetch('/api/classes');
    setClasses(await res.json());
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = formData.id ? `/api/students/${formData.id}` : '/api/students';
    const method = formData.id ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    setIsModalOpen(false);
    fetchStudents();
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await fetch(`/api/students/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      fetchStudents();
    }
  };

  const openModal = (student?: any) => {
    if (student) {
      setFormData(student);
    } else {
      setFormData({ id: '', rfid_uid: '', nis: '', name: '', class_id: '', parent_phone: '', photo_url: '' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Data Siswa</h2>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Tambah Siswa
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIS</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID RFID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. WA Ortu</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <img className="h-10 w-10 rounded-full" src={student.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.nis}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.class_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{student.rfid_uid}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.parent_phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openModal(student)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button onClick={() => confirmDelete(student.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {formData.id ? 'Edit Siswa' : 'Tambah Siswa'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">NIS</label>
                <input required type="text" value={formData.nis} onChange={e => setFormData({...formData, nis: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kelas</label>
                <select required value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Pilih Kelas</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">UID RFID</label>
                <input required type="text" value={formData.rfid_uid} onChange={e => setFormData({...formData, rfid_uid: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">No. WA Orang Tua</label>
                <input type="text" value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="0812..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL Foto (Opsional)</label>
                <input type="url" value={formData.photo_url} onChange={e => setFormData({...formData, photo_url: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm">
                  Simpan
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-500 mb-4">Yakin ingin menghapus siswa ini? Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button type="button" onClick={handleDelete} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm">
                Hapus
              </button>
              <button type="button" onClick={() => setDeleteId(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
