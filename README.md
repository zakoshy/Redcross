# 🌍 Relief & Psychological First Aid (PFA) Crisis System

Welcome to the **Relief & Psychological First Aid Platform** — a highly optimized, enterprise-grade humanitarian coordination system designed to support vulnerable beneficiaries, facilitate rapid-response alerts with early community dispatch, and distribute financial voucher wallets securely.

---

## 🌟 Human-Centric Terminology Aligned
To promote empathy, care, and dignity, the user-facing interface across all dashboards (Admin, Volunteer, Leader, Merchant) has been fully updated to refer to affected individuals as **Beneficiaries** instead of "victims". 
* **Database & API Stability**: The underlying PostgreSQL structure and Supabase schemas retain reference tags such as `victim_id` and the `victim` role enum to preserve backward-compatibilities, RLS policies, and triggers, requiring **zero database migrations** on your part.

---

## 🛠️ System Architecture & Core Modules

### 1. 🛡️ Admin Command Center (`/admin`)
A premium management portal for disaster response command and financial oversight:
*   **Aesthetic Metric Suite**: Supports real-time dashboards with visual analytics on disaster categories, budget distributions, and mental health trends.
*   **Disaster Triage Index**: Highlights real-time psychological assessment scores and flags suicidal/high-risk cases for manual counselor interventions.
*   **Suicidal Crisis Alert Dispatches**: If the PFA bot detects suicidal ideation or self-harm signals from any beneficiary, a persistent, prominent, and pulsated critical alert immediately flashes in the admin dashboard. Admins can view last-sent messages, review contact logs, and instantly dispatch registered volunteers or community leaders physically located in the same county as the beneficiary.
*   **SMS Config & Simulator deep link**: Secured back corner panel accessible via deep link `admin#sms-settings`, allowing API key registration and testing without cluttered sidebar items.

### 2. 📋 Volunteer Command Platform & Frappe DocType customizer (`/volunteer`)
Designed for on-the-ground volunteer coordinators registering beneficiaries:
*   **Frappe-Like Configuration Engine**: Allows supervisors to add, edit, or delete custom registration fields (e.g., livestock count, household size, special medical flags) in real-time directly from the dashboard setting drawer. Zero code changes/re-compiles needed!
*   **Database Schema Agnosticism**: Dynamic beneficiary attributes are automatically serialized into the `county` detail descriptor on submissions, allowing volunteers to save any dynamic field without needing SQL migrations!
*   **Incident and Disaster Reports**: Coordinates instant response dispatches triggered by regional community leaders.

### 3. 👥 Community Leader Onboarding & Emergency Alerts (`/register` & `/leader`)
A secure, step-by-step validator for local ward champions:
*   **Form-Structured Verification Questionnaire**: Requires detailed answers to diagnostic incident response questions (similar to a Google Form layout) before verifying candidates.
*   **Early warning system**: Community leaders act as immediate ward dispatch coordinators. If a regional disaster occurs, they issue high-priority ward triggers alerting admins and volunteers to instantly deploy campaigns first-hand.

### 4. 🪙 Decentralized Wallet-Redeemer Merchant Portal (`/merchant`)
Refactored to mirror a secure, offline bearer wallet platform:
*   **No Central Database Clutter**: Avoids writing granular beneficiary transaction row telemetry on centralized tables, operating as a secure bearer wallet system (highly durable and fast).
*   **Remaining Balance Trackers**: Instantly calculates and reveals the exact credit balance remaining on a voucher wallet right after a purchase is made.
*   **Safety Double-Redeem Interval Lock**: Blocks double redemption or replay attacks using an automatic 15-second system cooldown timer.
*   **Safaricom B2B Payout Integration Guide**: Beautiful in-app instructions illustrating how cash transfers from the pre-funded Red Cross Escrow PayBill are instantly cleared to the Merchant's Safaricom Buy-Goods Till/Business PayBill.

### 5. 🤖 Human-Centric PFA Bot & AI Co-pilot (`/chat`)
An empathetic, responsive therapist companion:
*   **Google Gemini Copilot**: Available for admins, volunteers, community leaders, and beneficiaries to help them manage distress, chronic exposure, and fatigue.
*   **Auto-Triage Diagnostics & Emergency Fallbacks**: If the system detects acute distress or suicidal symptoms during a session, it immediately triggers safety alerts and automatically assigns the nearest active volunteer or leader coordinate to step in and offer urgent physical assistance.

---

## 🔗 Deep Link Access to SMS Configurator

To maintain a clean and professional administrative workspace, the **SMS Config & Simulator** is hidden from the sidebar list. It remains fully accessible using reactive SPA hash navigation:

*   **URL Portal Link**: [https://ais-dev-difkbq5rw4a6odzwmtdk7a-326067413989.europe-west1.run.app/admin#sms-settings](https://ais-dev-difkbq5rw4a6odzwmtdk7a-326067413989.europe-west1.run.app/admin#sms-settings)
*   Alternatively, append `#sms-settings` directly to your active browser address bar while logged in as an administrator.

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
