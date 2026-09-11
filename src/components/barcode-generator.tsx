'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSvgProps {
  value: string;
  format?: 'EAN13' | 'CODE128' | 'auto';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
  lineColor?: string;
}

export default function BarcodeSvg({
  value,
  format = 'auto',
  width = 1.4,
  height = 28,
  displayValue = true,
  fontSize = 9,
  className = '',
  lineColor = '#000000',
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    const trimmed = value.trim();
    if (!trimmed) return;

    // Determinar formato adecuado
    let formatToUse = 'CODE128';
    const is13Digits = /^\d{13}$/.test(trimmed);

    if (format === 'EAN13' || (format === 'auto' && is13Digits)) {
      formatToUse = 'EAN13';
    }

    try {
      JsBarcode(svgRef.current, trimmed, {
        format: formatToUse,
        width,
        height,
        displayValue,
        fontSize,
        font: 'monospace',
        textMargin: 1,
        margin: 2,
        background: 'transparent',
        lineColor,
      });
    } catch (err) {
      // Si falla EAN13 por checksum, reintentar con CODE128
      if (formatToUse === 'EAN13') {
        try {
          JsBarcode(svgRef.current, trimmed, {
            format: 'CODE128',
            width,
            height,
            displayValue,
            fontSize,
            font: 'monospace',
            textMargin: 1,
            margin: 2,
            background: 'transparent',
            lineColor,
          });
        } catch (retryErr) {
          console.warn('[BARCODE] Fallo al generar código CODE128:', retryErr);
        }
      } else {
        console.warn('[BARCODE] Fallo al generar código:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, lineColor]);

  if (!value || !value.trim()) {
    return (
      <div className={`text-[10px] text-gray-400 font-mono italic text-center py-1 ${className}`}>
        [Sin código de barras]
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center overflow-hidden ${className}`}>
      <svg ref={svgRef} className="max-w-full block" />
    </div>
  );
}
