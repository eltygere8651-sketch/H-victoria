import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion } from 'motion/react';
import { Laptop, QrCode, ShieldCheck, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { authorizeQrSession, getSession } from '../services/storageService';

const DeviceLinker: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'AUTHORIZING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const currentUser = getSession();

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scanStatus === 'SCANNING') {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render((decodedText) => {
        // Expected format: https://.../qr-auth?sessionId=uuid
        try {
          const url = new URL(decodedText);
          const sessionId = url.searchParams.get('sessionId');
          if (sessionId) {
            handleAuthorize(sessionId);
            scanner?.clear();
          } else {
            setError("QR no válido para vinculación");
            setScanStatus('ERROR');
            scanner?.clear();
          }
        } catch (e) {
          setError("QR no válido");
          setScanStatus('ERROR');
          scanner?.clear();
        }
      }, (err) => {
        // Ignore errors during scanning
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanStatus]);

  const handleAuthorize = async (sessionId: string) => {
    if (!currentUser) return;
    setScanStatus('AUTHORIZING');
    try {
      await authorizeQrSession(sessionId, currentUser);
      setScanStatus('SUCCESS');
    } catch (err: any) {
      setError(err.message || "Error al vincular dispositivo");
      setScanStatus('ERROR');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="p-8 text-center">
          {scanStatus === 'IDLE' && (
            <>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
                <Laptop size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Vincular ordenador</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Escanea el código QR que se muestra en la pantalla de inicio de sesión de tu ordenador para entrar sin PIN.
              </p>
              <button
                onClick={() => setScanStatus('SCANNING')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <QrCode size={20} /> Escanear Código QR
              </button>
            </>
          )}

          {scanStatus === 'SCANNING' && (
            <>
              <h2 className="text-xl font-bold mb-4">Escaneando...</h2>
              <div id="reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700"></div>
              <button
                onClick={() => setScanStatus('IDLE')}
                className="mt-6 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </>
          )}

          {scanStatus === 'AUTHORIZING' && (
            <div className="py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Autorizando sesión...</p>
            </div>
          )}

          {scanStatus === 'SUCCESS' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">¡Vinculado!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Tu ordenador ya ha iniciado sesión. Ahora puedes gestionarlo todo desde allí.
              </p>
              <button
                onClick={onBack}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl"
              >
                Volver
              </button>
            </>
          )}

          {scanStatus === 'ERROR' && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Error de escaneo</h2>
              <p className="text-red-500 mb-8">{error}</p>
              <button
                onClick={() => setScanStatus('SCANNING')}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl mb-3"
              >
                Reintentar
              </button>
              <button
                onClick={() => setScanStatus('IDLE')}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-2xl"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </motion.div>
      <button 
        onClick={onBack}
        className="mt-8 flex items-center gap-2 text-slate-500 font-medium"
      >
        <ArrowLeft size={18} /> Volver al panel
      </button>
    </div>
  );
};

export default DeviceLinker;
