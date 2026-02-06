import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // App password
  },
});

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  try {
    const info = await transporter.sendMail({
      from: `"SpendWise Reports" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
}

export function generateReportHTML(data: {
  userName: string;
  duration: string;
  total: number;
  breakdown: { name: string; amount: number; percentage: number }[];
  highestCategory: string;
}) {
  const breakdownRows = data.breakdown
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.amount.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.percentage.toFixed(1)}%</td>
    </tr>`
    )
    .join("");

  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h1 style="color: #8B5CF6; border-bottom: 2px solid #8B5CF6; padding-bottom: 10px;">SpendWise ${data.duration} Report</h1>
      <p>Hello ${data.userName}, here is your expense summary.</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 16px; color: #6b7280;">TOTAL SPENT</h2>
        <p style="font-size: 32px; font-weight: bold; margin: 0; color: #111827;">₹${data.total.toFixed(2)}</p>
      </div>

      <h3>Category Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Category</th>
            <th style="padding: 12px; text-align: right;">Amount</th>
            <th style="padding: 12px; text-align: right;">%</th>
          </tr>
        </thead>
        <tbody>
          ${breakdownRows}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 8px;">
        <strong>Highest Spending Category:</strong> ${data.highestCategory}
      </div>

      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px;">
        Sent with ❤️ by SpendWise. You can manage your report settings in the app.
      </p>
    </div>
  `;
}

export function generateCategoryCalendarHTML(data: {
  userName: string;
  categoryName: string;
  monthName: string;
  total: number;
  fixedAmount: number | null;
  days: { day: number; isOrdered: boolean; isExpected: boolean; isFuture: boolean }[];
  startOffset: number;
}) {
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const weekDaysHeader = weekDays.map(d => `<th style="padding: 10px; text-align: center; font-size: 12px; color: #6b7280;">${d}</th>`).join("");

  let calendarRows = "";
  let currentWeek = Array(data.startOffset).fill(`<td></td>`);

  data.days.forEach((day, index) => {
    let bgColor = "#f3f4f6"; // Gray (Not expected, not ordered)
    let textColor = "#6b7280";
    let border = "1px solid transparent";

    if (day.isOrdered) {
      bgColor = "#dcfce7"; // Light Green
      textColor = "#166534";
      border = "1px solid #166534";
    } else if (day.isExpected && !day.isFuture) {
      bgColor = "#fee2e2"; // Light Red (Skipped)
      textColor = "#991b1b";
      border = "1px solid #991b1b";
    } else if (day.isExpected && day.isFuture) {
      bgColor = "#e0f2fe"; // Light Blue (Planned)
      textColor = "#0369a1";
      border = "1px solid #0369a1";
    }

    const showBadge = (day.isOrdered || day.isExpected) && data.fixedAmount;
    let badgeHtml = "";

    if (showBadge) {
      let badgeBg = "#f3f4f6";
      let badgeText = "#6b7280";
      if (day.isOrdered) { badgeBg = "#166534"; badgeText = "#ffffff"; }
      else if (day.isExpected && !day.isFuture) { badgeBg = "#991b1b"; badgeText = "#ffffff"; }
      else if (day.isExpected && day.isFuture) { badgeBg = "#0369a1"; badgeText = "#ffffff"; }

      badgeHtml = `
        <div style="position: absolute; top: -5px; right: -5px; background: ${badgeBg}; color: ${badgeText}; font-size: 7px; padding: 1px 3px; border-radius: 4px; line-height: 1; font-weight: bold; border: 1px solid rgba(255,255,255,0.2);">
          ${data.fixedAmount}
        </div>
      `;
    }

    currentWeek.push(`
      <td style="padding: 8px; text-align: center;">
        <div style="position: relative; width: 32px; height: 32px; margin: 0 auto;">
          <div style="width: 32px; height: 32px; line-height: 32px; border-radius: 8px; background: ${bgColor}; color: ${textColor}; border: ${border}; font-size: 12px; font-weight: bold;">
            ${day.day}
          </div>
          ${badgeHtml}
        </div>
      </td>
    `);

    if (currentWeek.length === 7 || index === data.days.length - 1) {
      while (currentWeek.length < 7) currentWeek.push(`<td></td>`);
      calendarRows += `<tr>${currentWeek.join("")}</tr>`;
      currentWeek = [];
    }
  });

  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 16px;">
      <h2 style="color: #8B5CF6; margin-bottom: 5px;">${data.categoryName}</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 0;">Monthly Report: ${data.monthName}</p>
      
      <div style="margin: 20px 0; background: #fafafa; border-radius: 12px; padding: 15px; text-align: center; border: 1px dashed #ddd;">
        <span style="display: block; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total Amount</span>
        <span style="font-size: 28px; font-weight: bold; color: #111827;">₹${data.total.toFixed(0)}</span>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>${weekDaysHeader}</tr>
        </thead>
        <tbody>
          ${calendarRows}
        </tbody>
      </table>

      <div style="margin-top: 25px; display: flex; gap: 15px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 12px; background: #dcfce7; border: 1px solid #166534; border-radius: 3px;"></div>
          <span>Ordered</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 12px; background: #fee2e2; border: 1px solid #991b1b; border-radius: 3px;"></div>
          <span>Skipped</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 12px; background: #e0f2fe; border: 1px solid #0369a1; border-radius: 3px;"></div>
          <span>Planned</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 12px; background: #f3f4f6; border-radius: 3px;"></div>
          <span>No Plan</span>
        </div>
      </div>

      <p style="text-align: center; color: #9ca3af; font-size: 10px; margin-top: 30px;">
        Generated by SpendWise. Your digital expense companion.
      </p>
    </div>
  `;
}
