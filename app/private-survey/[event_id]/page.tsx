'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivateSurveyRedirect({ params }: { params: Promise<{ event_id?: string; id?: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams?.event_id || resolvedParams?.id;
  const router = useRouter();

  useEffect(() => {
    if (eventId) {
      // 💡 新デザインのカラフル回答画面へ即座に自動移動
      router.replace(`/p/${eventId}/private`);
    }
  }, [eventId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 font-sans">
      <div className="text-center p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-orange-100">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-bold text-sm">アンケート画面へ移動中...</p>
      </div>
    </div>
  );
}