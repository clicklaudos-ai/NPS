import { Suspense } from 'react';
import AvaliarClient from '../../components/AvaliarClient';

export const dynamic = 'force-dynamic';

export default function AvaliarPage() {
  return (
    <Suspense fallback={null}>
      <AvaliarClient />
    </Suspense>
  );
}
