'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaginaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/banners');
  }, [router]);

  return (
    <div className="p-8 text-center text-gray-500">
      Redirigiendo a Banners...
    </div>
  );
}
