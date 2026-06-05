# 🌍 Relief & Psychological First Aid (PFA) Crisis System

Welcome to the **Relief & Psychological First Aid Platform** — a highly optimized, professional web application designed to support disaster victims and coordinate relief disbursements with absolute precision and elegance.

This system is built with lightweight, responsive frontend states, dark/light visual modes customized to mirror a premium financial/merchant dashboard, and integrated with Africa's Talking API for automated SMS notification support.

---

## 🚀 Key System Capabilities

### 1. 🛡️ Admin Command Center (`/admin`)
A premium management portal for disaster response command:
*   **Aesthetic Alignment**: Follows a cohesive design theme, supporting high-contrast ambient dark mode or paper-white light theme.
*   **Disaster Triage Index**: Highlights real-time psychological assessment metrics and tracks high-risk cases seamlessly.
*   **Voucher Relief Campaigns**: Allows administrators to instantiate voucher initiatives (e.g., medical, food, shelter support packages) in one click.
*   **Direct SMS Admin Key Settings**: Accessible via deep link format (`/admin#sms-settings`) to configure credentials completely separate from the clean day-to-day administrative panels.

### 2. 🤖 Psychological First Aid (PFA) & Beneficiary Portal (`/chat`)
An safe, compassionate terminal for victims/survivors:
*   **Safe-Space AI Chatbot**: Powered by Google Gemini to perform empathetic assessments and psychological support.
*   **Active Risk Classification**: Evaluates distressing patterns, establishing real-time triage risk percentages (0% to 100%) to instantly flag cases for human counselors inside Supabase.
*   **Frictionless Credit Cards**: Provides visible balance codes with instant copy functionality (matching the Merchant Dashboard layout) to prove eligibility at physical redemption centers.

### 3. 🪙 Redemptive Merchant Portal (`/merchant`)
Designed for retail partners handling regional supplies:
*   An elegant, high-contrast dashboard to verify vouchers and execute immediate relief credits in local currency safely.

---

## 🔗 Deep Link Access to Hidden Interfaces

The system's **SMS Config & Simulator** has been securely hidden from the default administrative sidebar to maintain a professional workspace. However, it is fully accessible using reactive SPA routing parameter deep hashes:

*   **URL Portal Link**: [https://ais-dev-difkbq5rw4a6odzwmtdk7a-326067413989.europe-west1.run.app/admin#sms-settings](https://ais-dev-difkbq5rw4a6odzwmtdk7a-326067413989.europe-west1.run.app/admin#sms-settings)
*   Alternatively, append `?tab=sms-settings` or hash `#sms-settings` directly to your active browser address bar while logged in as an administrator.

---

## 📱 Exact Phone Number Normalization

To comply with Africa's Talking SMS API standards, the application automatically intercepting and normalizes phone numbers securely utilizing the standard `normalizePhone` function.

### Standard Transformation Rules:
1.  **Leading Spaces Removed**: Strips all empty gaps, tabs, carriage returns, or spaces.
2.  **Preserves Signs**: Keeps the leading plus symbol (`+`) intact.
3.  **Local to International**: Conversions starting with `07...` or `01...` to `+254...`.
4.  **Raw International representation**: Automatically prepends `+` prefix to raw numbers starting with `254...`.

### Transformation Mapping:
*   `+254 711 223344` ➔ `+254711223344`
*   `0711223344` ➔ `+254711223344`
*   `254711223344` ➔ `+254711223344`

---

## 🔨 Developer Simulation Feature

In cases where your team is operating in an **Africa's Talking Sandbox Environment** and local recipient cellular targets have not yet been registered in the Sandbox Teams list (which triggers an **InvalidPhoneNumber (Code 403)** error), you can enable the **SMS Simulation Mode** under the SMS settings tab. 

When **active**, the system logs API warnings/exceptions but automatically bypasses the blockade to simulate successful SMS delivery, ensuring base ledger allocations complete successfully!
