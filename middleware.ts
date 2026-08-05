import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 管理者ダッシュボード（/）とCSV出力（/admin/*）にアクセスした時だけパスワードを求める
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // ユーザーが入力したIDとパスワードを解読
    const [user, pwd] = atob(authValue).split(':');

    // 環境変数のID・パスワードと一致するか確認
    if (user === process.env.ADMIN_USER && pwd === process.env.ADMIN_PASSWORD) {
      return NextResponse.next(); // 認証成功（ページを表示）
    }
  }

  // 認証失敗時、または初回アクセス時はパスワード入力画面を表示
  return new NextResponse('認証が必要です。', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// ミドルウェアを適用するURLを指定（トップページ ＋ 管理者ページ配下すべて）
export const config = {
  matcher: ['/', '/admin/:path*'],
};