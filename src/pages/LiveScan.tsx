import { useEffect, useState } from 'react';
import { ScanLine, CheckCircle, LogOut, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ScanEvent = {
  type: 'SCAN' | 'UNKNOWN_CARD';
  student?: any;
  scanType?: 'IN' | 'OUT' | 'ALREADY_OUT';
  time: string;
  date: string;
  uid?: string;
};

export default function LiveScan() {
  const [lastScan, setLastScan] = useState<ScanEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastScan(data);
      
      // Auto clear after 5 seconds
      setTimeout(() => {
        setLastScan((prev) => (prev === data ? null : prev));
      }, 5000);
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="mb-8 flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
        <span className="text-sm text-gray-500 font-medium">
          {isConnected ? 'RFID Reader Connected' : 'Connecting to RFID Reader...'}
        </span>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 min-h-[400px] flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {!lastScan ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-gray-400"
            >
              <ScanLine className="w-24 h-24 mb-4 animate-pulse" />
              <h2 className="text-2xl font-semibold">Silakan Tap Kartu RFID</h2>
            </motion.div>
          ) : lastScan.type === 'UNKNOWN_CARD' ? (
            <motion.div
              key="unknown"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center text-red-500"
            >
              <AlertTriangle className="w-24 h-24 mb-4" />
              <h2 className="text-3xl font-bold mb-2">Kartu Tidak Dikenal</h2>
              <p className="text-xl">UID: {lastScan.uid}</p>
              <p className="text-gray-500 mt-2">{lastScan.time}</p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center w-full p-8"
            >
              <div className="relative">
                <img
                  src={lastScan.student.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lastScan.student.name}`}
                  alt={lastScan.student.name}
                  className="w-40 h-40 rounded-full border-4 border-indigo-100 shadow-lg object-cover"
                />
                <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${
                  lastScan.scanType === 'IN' ? 'bg-green-500' : 
                  lastScan.scanType === 'OUT' ? 'bg-blue-500' : 'bg-yellow-500'
                }`}>
                  {lastScan.scanType === 'IN' ? <CheckCircle className="w-6 h-6" /> : 
                   lastScan.scanType === 'OUT' ? <LogOut className="w-6 h-6" /> : 
                   <AlertTriangle className="w-6 h-6" />}
                </div>
              </div>
              
              <h2 className="text-4xl font-bold text-gray-900 mt-6 mb-2 text-center">{lastScan.student.name}</h2>
              <p className="text-xl text-gray-600 mb-6">{lastScan.student.class_name} • {lastScan.student.nis}</p>
              
              <div className={`px-6 py-3 rounded-full text-xl font-bold ${
                lastScan.scanType === 'IN' ? 'bg-green-100 text-green-800' : 
                lastScan.scanType === 'OUT' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {lastScan.scanType === 'IN' ? 'BERHASIL MASUK' : 
                 lastScan.scanType === 'OUT' ? 'BERHASIL PULANG' : 'SUDAH PULANG'}
              </div>
              
              <p className="text-gray-500 mt-6 text-2xl font-mono">{lastScan.time}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
