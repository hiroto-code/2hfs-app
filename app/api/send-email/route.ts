import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // どんな名前でデータが届いても柔軟に受け取れるように設定
    const email = body.email || body.recipientEmail;
    const name = body.name || body.displayName || body.display_name || 'ゲスト';
    const rawDashboardUrl = body.dashboardUrl || body.url || body.link;

    // URLが取得できない場合の安全対策
    const dashboardUrl = rawDashboardUrl && !rawDashboardUrl.includes('undefined')
      ? rawDashboardUrl
      : `https://${request.headers.get('host')}/mypage`;

    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '【健幸度チェック】スコアの保存とマイダッシュボードのご案内 🌿',
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ea580c; text-align: center;">
            ${name} さん、記録が保存されました！✨
          </h2>
          <p style="text-align: center; color: #666; font-size: 14px; margin-bottom: 30px;">
            ご自身の健幸度の推移は、いつでも以下のマイダッシュボードからご確認いただけます。
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
              📊 マイダッシュボードを開く
            </a>
          </div>
        </div>
      `,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Send Email Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}