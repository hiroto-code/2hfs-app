import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // トップページ（管理者ダッシュボード）にアクセスした時だけパスワードを求める
  if (req.nextUrl.pathname === '/') {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      // ユーザーが入力したIDとパスワードを解読
      const [user, pwd] = atob(authValue).split(':');

      // ID: admin, パスワード: 0515 で一致するか確認
      if (user === 'admin' && pwd === '0515') {
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

  // 管理者ページ以外（/p/〜 などのアンケート画面）はそのままスルー
  return NextResponse.next();
}

// ミドルウェアを適用するURLを指定（トップページのみ）
export const config = {
  matcher: ['/'],
};