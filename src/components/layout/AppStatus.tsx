import { useEffect, useState } from 'react';
import { Download, WifiOff, X, RefreshCw, Smartphone } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Modal } from '../ui/Modal';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const [storageError, setStorageError] = useState(false);
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { console.warn('Chưa thể chuẩn bị chế độ offline:', error); },
  });

  useEffect(() => {
    const connection = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallEvent); };
    const complete = () => { setInstalled(true); setInstallEvent(null); };
    const failure = () => setStorageError(true);
    window.addEventListener('online', connection); window.addEventListener('offline', connection);
    window.addEventListener('beforeinstallprompt', prompt); window.addEventListener('appinstalled', complete);
    window.addEventListener('mathnexus:storage-error', failure);
    return () => {
      window.removeEventListener('online', connection); window.removeEventListener('offline', connection);
      window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', complete);
      window.removeEventListener('mathnexus:storage-error', failure);
    };
  }, []);

  const install = async () => {
    if (!installEvent) { setInstructions(true); return; }
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch { setInstructions(true); }
    setInstallEvent(null);
  };

  return <>
    <div className="app-status"><span><span className={`status-dot ${online ? '' : 'offline'}`} />{!online ? 'Đang học ngoại tuyến' : offlineReady ? 'Sẵn sàng học ngoại tuyến' : 'Góc học tập của riêng bạn'}</span>{!installed && <button onClick={() => void install()}><Download size={15} />Cài ứng dụng</button>}</div>
    {(!online || needRefresh || storageError) && <div className="status-banner" role="status">
      {storageError ? <><span>Chưa lưu được dữ liệu. Hãy kiểm tra dung lượng hoặc quyền lưu trữ của trình duyệt.</span><button className="icon-button" aria-label="Đóng thông báo" onClick={() => setStorageError(false)}><X size={18} /></button></> : needRefresh ? <><RefreshCw size={18} /><span>MathNexus có phiên bản mới.</span><button className="text-link" onClick={() => void updateServiceWorker(true)}>Cập nhật</button><button className="icon-button" aria-label="Để sau" onClick={() => setNeedRefresh(false)}><X size={18} /></button></> : <><WifiOff size={18} /><span>Bạn đang ngoại tuyến. Bài học, luyện tập và sổ tay vẫn dùng được sau khi tải xong ứng dụng.</span></>}
    </div>}
    {instructions && <Modal title="Mang MathNexus theo bạn" onClose={() => setInstructions(false)}><div className="install-instructions"><Smartphone size={40} /><p>Cài lên màn hình chính để mở nhanh và học cả khi mất mạng.</p><h3>iPhone / iPad</h3><p>Mở bằng Safari → nhấn Chia sẻ → <strong>Thêm vào Màn hình chính</strong>.</p><h3>Android</h3><p>Mở bằng Chrome → menu ⋮ → <strong>Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</p><h3>Máy tính</h3><p>Dùng Chrome hoặc Edge, chọn biểu tượng cài đặt ở thanh địa chỉ. Tính năng cài đặt cần HTTPS hoặc localhost.</p><small>Lần đầu, mở ứng dụng khi có mạng để tải bài học. Trợ lý Gemini cần kết nối Internet.</small></div></Modal>}
  </>;
}
