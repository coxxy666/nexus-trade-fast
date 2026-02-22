import React, { useEffect, useState } from 'react';
import { useWallet } from './WalletContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

export default function WalletConnectQR() {
  const { wcUri, wcSelectedWallet, showWcQr, setShowWcQr, getWalletDeepLinkUrl } = useWallet();
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (wcUri) {
      generateQRCode(wcUri);
    }
  }, [wcUri]);

  const generateQRCode = async (uri) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('QR Code generation error:', error);
    }
  };

  const openSelectedWallet = () => {
    if (!wcUri || !wcSelectedWallet) return;
    const targetUrl = getWalletDeepLinkUrl?.(wcSelectedWallet, wcUri);
    if (!targetUrl) return;
    window.location.href = targetUrl;
  };

  return (
    <Dialog open={showWcQr} onOpenChange={setShowWcQr}>
      <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan with WalletConnect</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-8">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="WalletConnect QR Code" 
              className="w-64 h-64 bg-white p-2 rounded-lg"
            />
          ) : (
            <div className="w-64 h-64 bg-white/10 rounded-lg animate-pulse flex items-center justify-center">
              Generating QR Code...
            </div>
          )}
          <p className="text-center text-sm text-gray-400 mt-6">
            Open your mobile wallet and scan this QR code to connect
          </p>
          {wcSelectedWallet && (
            <button
              onClick={openSelectedWallet}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-sm hover:bg-blue-500/30 transition-colors"
            >
              Open {wcSelectedWallet}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

