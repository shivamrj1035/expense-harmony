# SpendWise: Your Advanced Analytics Hub 📈

SpendWise is a high-performance financial tracking application designed for clarity, flexibility, and professional reporting. Transform your spending data into actionable insights with our modular dashboard and automated reporting engine.

## ✨ Core Features

### 🚀 Modular Analytics Hub
*   **Resizable Widgets**: Customize your dashboard by "stretching" or "shrinking" cards. Focus on what matters—whether it's a full-width Spending Pulse or a compact breakdown.
*   **Drag-and-Drop Layout**: Reorder your financial widgets to suit your workflow. Your custom layout is automatically persisted.

### 📊 Deep Financial Insights
*   **Spending Velocity**: Visualize daily transaction patterns over a 14-day rolling window.
*   **6-Month Pulse**: Track monthly spending trends to identify long-term seasonal patterns.
*   **Visual Breakdown**: Interactive pie charts and detailed category utilization bars for immediate clarity on budget allocation.
*   **Activity Stream**: A high-fidelity log of your most recent financial movements.

### ✉️ Professional Reporting Engine
*   **Smart Email Analysis**: Dispatch monthly financial hubs directly to your email with a single click.
*   **High-Fidelity PDF Exports**: Generate professional transaction ledgers and category summaries in PDF format, ready for download or archive.
*   **Calendar Tracking**: Specialized views for recurring expenses with "Ordered vs. Skipped" status indicators.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Database**: [Prisma](https://www.prisma.io/) + [PostgreSQL (Supabase)](https://supabase.com/)
*   **Authentication**: [Clerk](https://clerk.com/)
*   **Styling**: Tailwind CSS + shadcn/ui + Glassmorphism Design
*   **Charts**: [Recharts](https://recharts.org/)
*   **Email**: [Nodemailer](https://nodemailer.com/) (Gmail SMTP Integration)
*   **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)

## 🚦 Getting Started

### 1. Prerequisites
*   Node.js 18+
*   PostgreSQL Database instance

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd spendwise

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# Database
DATABASE_URL=your_db_url

# Email (SMTP)
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
```

### 4. Database Initialization
```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server
```bash
npm run dev
```

## 💡 Helpfulness & Usage
Identify where your money is flowing within seconds. Use the **Analytics Hub** to spot anomalies in your "Month Burn" and use the **Send Report** feature to export your data for tax season or personal audits. SpendWise isn't just a tracker; it's a decision-making engine for your personal finance.

---
Built with ❤️ by the SpendWise Team.
