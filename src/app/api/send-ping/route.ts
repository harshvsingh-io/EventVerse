import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, eventTitle, clubName, categoryName, eventDescription, venue, date, regLink, bannerUrl, clubLogo, eventUrl } = body;

    if (!email || !eventTitle || !clubName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Mock mode logging
      console.log(`[RESEND SIMULATION] Email sent to ${email} for event "${eventTitle}"`);
      return NextResponse.json({ success: true, simulated: true });
    }

    const resend = new Resend(apiKey);

    // Dynamic HTML Template matching the brand styling
    const htmlContent = `
      <div style="background-color: #06060c; color: #f5f5f7; font-family: sans-serif; padding: 32px 16px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #141424;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; font-weight: bold; font-size: 16px;">
            E
          </div>
          <h1 style="color: #ffffff; margin-top: 12px; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">EventVerse Campus Network</h1>
          <p style="color: #a78bfa; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">New Campus Broadcast</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <img src="${clubLogo || 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100'}" alt="${clubName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 12px; border: 1px solid rgba(255,255,255,0.1);" />
            <div>
              <h4 style="color: #ffffff; margin: 0; font-size: 14px; font-weight: bold;">${clubName}</h4>
              <span style="color: #8b5cf6; font-size: 10px; font-weight: bold; text-transform: uppercase; background: rgba(139, 92, 246, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">${categoryName}</span>
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
          
          <div style="text-align: center; margin-top: 24px;">
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
        
        <div style="text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
          You are receiving this because you subscribed to "${categoryName}" notifications on EventVerse.<br/>
          To update your preferences, visit your EventVerse Settings dashboard.
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: "EventVerse Announcements <onboarding@resend.dev>", // default dev domain
      to: [email],
      subject: `[${clubName}] New Campus Broadcast: ${eventTitle}`,
      html: htmlContent
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
