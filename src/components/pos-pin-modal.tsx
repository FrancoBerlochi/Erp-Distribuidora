'use client';

import { useState, useEffect } from 'react';
import { X, Lock, KeyRound, Delete, CheckCircle2, User } from 'lucide-react';
import { UserProfile } from '@/lib/pos-types';
import { getStoredProfiles, verifyUserPin } from '@/lib/pos-service';

interface POSPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (user: UserProfile) => void;
  currentUserId?: string;
}

export default function POSPinModal({ isOpen, onClose, onAuthenticate, currentUserId }: POSPinModalProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const list = getStoredProfiles();
      setProfiles(list);
      const initial = list.find((p) => p.id === currentUserId) || list[0];
      setSelectedUser(initial || null);
      setPin('');
      setErrorMsg('');
    }
  }, [isOpen, currentUserId]);

  // Manejo de teclado físico
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, selectedUser]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4 && selectedUser) {
      void validatePin(newPin, selectedUser);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const validatePin = async (inputPin: string, user: UserProfile) => {
    const isValid = await verifyUserPin(inputPin, user);
    if (isValid) {
      onAuthenticate(user);
      onClose();
    } else {
      setErrorMsg('PIN incorrecto. Intente nuevamente.');
      setPin('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center">
        {/* Cabecera */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-primary flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Cambio de Cajero</h3>
              <p className="text-[11px] text-gray-500">Ingresa tu PIN de 4 dígitos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Usuario / Cajero */}
        <div className="w-full mb-5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            Seleccionar Operador:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {profiles.map((p) => {
              const isSelected = selectedUser?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(p);
                    setPin('');
                    setErrorMsg('');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#dc2626] bg-red-50/70 dark:bg-red-950/40 text-gray-900 dark:text-white font-black shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                    isSelected ? 'bg-[#dc2626] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs truncate">{p.full_name}</p>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">
                      {p.role}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Círculos Indicadores de PIN */}
        <div className="flex items-center justify-center gap-3 my-2 mb-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#dc2626] border-[#dc2626] scale-110'
                    : 'border-gray-300 dark:border-gray-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-3 text-center animate-shake">
            {errorMsg}
          </p>
        )}

        {/* Teclado Numérico Táctil */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 text-xl font-black text-gray-900 dark:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 text-xs font-extrabold text-gray-500 dark:text-gray-400 transition-all flex items-center justify-center cursor-pointer"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 text-xl font-black text-gray-900 dark:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 text-gray-500 dark:text-gray-400 transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[10px] text-gray-400 mt-4 text-center">
          Acceso protegido con cifrado criptográfico SHA-256
        </p>
      </div>
    </div>
  );
}
