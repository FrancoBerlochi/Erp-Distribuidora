'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { playScannerBeep } from '@/lib/pos-service';

interface POSCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function POSCameraScanner({ isOpen, onClose, onScan }: POSCameraScannerProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'pos-camera-reader-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setScannerError(null);
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Preferir cámara trasera ('back' o 'environment') en celulares
          const backCam = devices.find((d) => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('environment')
          );
          const chosenId = backCam ? backCam.id : devices[devices.length - 1].id;
          setActiveCameraId(chosenId);
          startScanner(chosenId);
        } else {
          setScannerError('No se detectaron cámaras en este dispositivo.');
        }
      })
      .catch((err) => {
        console.error(err);
        setScannerError('Permiso de cámara denegado o no disponible.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = (cameraId: string) => {
    try {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          launchScanner(cameraId);
        });
      } else {
        launchScanner(cameraId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const launchScanner = (cameraId: string) => {
    const html5QrCode = new Html5Qrcode(containerId);
    html5QrCodeRef.current = html5QrCode;

    html5QrCode
      .start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          playScannerBeep();
          onScan(decodedText);
          onClose();
        },
        () => {
          // Frame sin lectura, ignorar
        }
      )
      .then(() => {
        setScanning(true);
      })
      .catch((err) => {
        console.error('Error iniciando html5QrCode:', err);
        setScannerError('Error al iniciar la transmisión de video.');
      });
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop().catch(() => {}).finally(() => {
          try {
            html5QrCodeRef.current?.clear();
          } catch {}
          html5QrCodeRef.current = null;
          setScanning(false);
        });
      } catch {
        html5QrCodeRef.current = null;
      }
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIdx = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    const nextCamId = cameras[nextIdx].id;
    setActiveCameraId(nextCamId);
    startScanner(nextCamId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Cabecera */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#dc2626] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">
                Escáner con Cámara
              </h3>
              <p className="text-[11px] text-gray-500">Apunta la cámara al código de barras</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                title="Cambiar cámara"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor de Cámara */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          <div id={containerId} className="w-full h-full"></div>

          {/* Marco guía visual */}
          {scanning && !scannerError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-36 border-2 border-red-500 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/80 animate-pulse"></div>
              </div>
            </div>
          )}

          {scannerError && (
            <div className="p-6 text-center text-white space-y-2 z-10">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-xs font-bold text-red-200">{scannerError}</p>
              <button
                type="button"
                onClick={() => activeCameraId && startScanner(activeCameraId)}
                className="text-xs bg-white text-gray-900 font-bold px-4 py-2 rounded-xl mt-2"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Soporta EAN-13, EAN-8, UPC, Code 128 y QR
          </p>
        </div>
      </div>
    </div>
  );
}
