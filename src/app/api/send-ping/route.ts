import { NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, eventTitle, clubName, categoryName, eventDescription, venue, date, regLink, bannerUrl, clubLogo, eventUrl } = body;

    if (!email || !eventTitle || !clubName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Dynamic HTML Template matching the brand styling
    const htmlContent = `
      <div style="background-color: #06060c; color: #f5f5f7; font-family: sans-serif; padding: 32px 16px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #141424;">
        <div style="text-align: center; margin-bottom: 24px;">
          ${clubLogo ? `<img src="${clubLogo}" alt="${clubName}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #7c3aed; object-fit: cover;" />` : ""}
          <div style="color: #8b5cf6; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px;">
            ${clubName} • ${categoryName}
          </div>
        </div>
        
        <h2 style="color: #ffffff; font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 12px;">📢 New Announcement: ${eventTitle}</h2>
        
        ${bannerUrl ? `<img src="${bannerUrl}" alt="${eventTitle}" style="width: 100%; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.05);" />` : ""}
        
        <p style="color: #d1d5db; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          ${eventDescription}
        </p>
        
        <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.04);">
          <div style="margin-bottom: 8px; font-size: 12px; color: #9ca3af;">
            <strong>📍 Venue:</strong> ${venue}
          </div>
          <div style="font-size: 12px; color: #9ca3af;">
            <strong>📅 Date & Time:</strong> ${new Date(date).toLocaleString()}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 24px; margin-bottom: 16px;">
          ${regLink ? `
            <a href="${regLink}" target="_blank" style="background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; font-weight: bold; text-decoration: none; font-size: 13px; padding: 12px 24px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(124,58,237,0.2); margin-right: 12px; margin-bottom: 8px;">
              Register for Event
            </a>
          ` : ""}
          ${eventUrl ? `
            <a href="${eventUrl}" target="_blank" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; font-weight: bold; text-decoration: none; font-size: 13px; padding: 12px 24px; border-radius: 8px; display: inline-block; margin-bottom: 8px;">
              View Campus Details
            </a>
          ` : ""}
        </div>
      </div>
      
      <div style="text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; max-width: 600px; margin: 16px auto 0 auto;">
        You are receiving this because you subscribed to "${categoryName}" notifications on EventVerse.<br/>
        To update your preferences, visit your EventVerse Settings dashboard.
      </div>
    `;

    // Priority 1: Gmail SMTP integration via Nodemailer (100% Free, Arbitrary recipients)
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailAppPassword) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailAppPassword
        }
      });

      await transporter.sendMail({
        from: `"EventVerse Announcements" <${gmailUser}>`,
        to: email,
        subject: `[${clubName}] New Campus Broadcast: ${eventTitle}`,
        html: htmlContent
      });

      console.log(`[SMTP GMAIL] Real email sent to ${email} via Gmail SMTP.`);
      return NextResponse.json({ success: true, method: "gmail" });
    }

    // Priority 2: Resend API integration (requires domain verification)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const data = await resend.emails.send({
        from: "EventVerse Announcements <onboarding@resend.dev>",
        to: [email],
        subject: `[${clubName}] New Campus Broadcast: ${eventTitle}`,
        html: htmlContent
      });
      console.log(`[RESEND API] Real email sent to ${email} via Resend.`);
      return NextResponse.json({ success: true, method: "resend", data });
    }

    // Fallback: Mock simulation logging
    console.log(`[SIMULATION LOG] Email sent to ${email} for event "${eventTitle}"`);
    return NextResponse.json({ success: true, simulated: true });
  } catch (err: any) {
    console.error("Email API Route Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
