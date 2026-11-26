'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { joinLeagueAction } from '@/lib/ligas/actions';

export function JoinInvite({ code }: { code: string }): React.JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const res = await joinLeagueAction(code);
    if (res.ok) {
      router.push(`/ligas/${res.data}`);
      router.refresh();
    } else {
      setBusy(false);
      setError(res.error);
    }
  };

  return (
    <div className="mt-5">
      {error && <p role="alert" className="mb-3 rounded-[12px] bg-[#e04a66]/15 px-4 py-3 text-sm text-[#ff8da1]">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void join()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-kurama font-semibold text-ink disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Unirme a la liga
      </button>
    </div>
  );
}
