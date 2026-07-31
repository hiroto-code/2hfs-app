'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function MyPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // 1. ログイン状態の確認
      const { data: { session } } = await supabase.auth.getSession();
      
      // ログインしていなければログイン画面へ
      if (!session) {
        router.push('/mypage/login');
        return;
      }

      const email = session.user.email;

      if (email) {
        // 2. メールアドレスから participant_id を特定する
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('participant_id')
          .eq('email', email)
          .maybeSingle();

        // 3. グラフ付きの美しいダッシュボードへ自動転送！
        if (profile?.participant_id) {
          router.push(`/my/${profile.participant_id}`);
        } else {
          // プロフィールが未登録の場合は、とりあえずメールアドレスをURLにして転送
          router.push(`/my/${email}`);
        }
      } else {
        router.push('/mypage/login');
      }
    };

    checkUserAndRedirect();
  }, [router]);

  // 転送中のローディング画面
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <div className="text-gray-500 font-bold text-sm">ダッシュボードを準備中...</div>
    </div>
  );
}