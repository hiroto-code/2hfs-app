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

  // 転送中のローディング画面（温かみのあるデザインに変更）
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 relative overflow-hidden">
      {/* 装飾用の背景円 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-40 -z-10 transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-200 rounded-full blur-3xl opacity-40 -z-10 transform -translate-x-1/3 translate-y-1/3"></div>

      {/* スピナー（くるくる）をオレンジ系に変更 */}
      <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-400 rounded-full animate-spin mb-6 shadow-sm"></div>
      
      {/* テキストも世界観に合わせて調整し、少しフワフワ点滅させる */}
      <div className="text-orange-600 font-bold text-sm tracking-widest animate-pulse">
        ダッシュボードを準備中...
      </div>
    </div>
  );
}