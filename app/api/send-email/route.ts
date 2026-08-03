import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Resendの準備
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 画面から送られてきたデータ（メールアドレスや名前）を受け取る
    const { email, displayName, myPageUrl } = await request.json();

    // メールを送信する処理
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // ← 今はテスト用なので、このままにしてください
      to: [email],
      subject: '【健幸度チェック】スコアの保存とマイダッシュボードのご案内 🌿',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ea580c;">${displayName} さん、記録が保存されました！✨</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            ご自身の健幸度の推移は、いつでも以下のマイダッシュボードからご確認いただけます。
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${myPageUrl}" style="background: linear-gradient(to right, #ea580c, #e11d48); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
              📊 マイダッシュボードを開く
            </a>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
  }
}