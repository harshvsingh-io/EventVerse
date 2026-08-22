import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock");

export async function POST(req: Request) {
  try {
    const { email, name, username, role } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to EventVerse</title>
        <style>
          body {
            background-color: #030307;
            color: #f5f5f7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: #090911;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 24px;
            padding: 32px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 2px;
            background: linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 24px;
            display: inline-block;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 12px;
            color: #ffffff;
          }
          p {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .metadata {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 28px;
            text-align: left;
          }
          .meta-item {
            font-size: 11px;
            margin-bottom: 8px;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-item strong {
            color: #ffffff;
            text-transform: none;
            float: right;
          }
          .btn {
            background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
            color: #ffffff !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            display: inline-block;
            box-shadow: 0 8px 20px rgba(124, 58, 237, 0.25);
          }
          .footer {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.35);
            margin-top: 32px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div className="container">
          <div className="logo">EVENTVERSE</div>
          <h1>Welcome to the Universe, ${name || username}! 🚀</h1>
          <p>
            Your campus event network account has been verified. Discover announcements, constellation channels, and official events in a noise-free isolated universe.
          </p>

          <div className="metadata">
            <div className="meta-item">Username: <strong>@${username}</strong></div>
            <div className="meta-item">Privilege Role: <strong>${role.replace("_", " ")}</strong></div>
            <div className="meta-item">Status: <strong>Active / Verified</strong></div>
          </div>

          <a href="${req.headers.get("origin") || "https://event-verse-taupe.vercel.app"}/feed" className="btn">
            Enter Universe Feed
          </a>

          <div className="footer">
            &copy; ${new Date().getFullYear()} EventVerse Campus Networks. Every Campus is a Small Universe.
          </div>
        </div>
      </body>
      </html>
    `;

    // Attempt sending welcome email (fallback to onboarding@resend.dev if using sandbox key)
    const sender = process.env.RESEND_API_KEY ? "EventVerse <welcome@eventverse.com>" : "onboarding@resend.dev";
    
    const data = await resend.emails.send({
      from: sender,
      to: [email],
      subject: "Welcome to the EventVerse Universe! 🚀",
      html: welcomeHtml
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Welcome email route error:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch email" }, { status: 500 });
  }
}
