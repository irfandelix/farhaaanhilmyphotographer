'use client';

import { Suspense, use } from 'react';
import InvoiceView from '@/components/InvoiceView';

export default function AdminInvoicePage({ params }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Memuat Invoice...</div>}>
      <InvoiceView id={id} />
    </Suspense>
  );
}
