import express from "express";
import { createRequire } from "module";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
dotenv.config();

let supabaseInstance: any = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn("WARNING: Supabase URL or Anon Key is missing. Database endpoints will not function until they are set in environment variables.");
      throw new Error("Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

let atSms: any = null;
let twilioClient: any = null;
let lastUsedApiKey = "";
let lastUsedUsername = "";

function getAtSms(customApiKey?: string, customUsername?: string) {
  const username = customUsername || process.env.AFRICAS_TALKING_USERNAME || process.env.AFRICA_S_TALKING_USERNAME || 'sandbox';
  const apiKey = customApiKey || process.env.AFRICAS_TALKING_API_KEY || process.env.AFRICA_S_TALKING_API_KEY || '';

  if (atSms && username === lastUsedUsername && apiKey === lastUsedApiKey) {
    return atSms;
  }

  try {
    const africastalking = require("africastalking");
    console.log(`[SMS API] Constructing Africa's Talking SMS instance with username: "${username}" (API Key size: ${apiKey ? apiKey.length : 0})`);
    const at = africastalking({
      apiKey: apiKey,
      username: username
    });
    atSms = at.SMS;
    lastUsedApiKey = apiKey;
    lastUsedUsername = username;
    return atSms;
  } catch (error) {
    console.error("Failed to initialize Africa's Talking Client:", error);
    return null;
  }
}

function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require("twilio");
      twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (error) {
      console.error("Failed to initialize Twilio:", error);
    }
  }
  return twilioClient;
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Africa's Talking USSD Callback
app.post("/api/ussd", async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  let response = "";

  if (text === "") {
    response = `CON Welcome to PFA Aid System
1. Check Balance
2. Redeem Voucher
3. Emergency Support`;
  } else if (text === "1") {
    try {
      // Fetch profile by phone number
      const db = getSupabase();
      const { data: profile, error: pError } = await db
        .from('profiles')
        .select('id, full_name')
        .eq('phone_number', phoneNumber)
        .single();

      if (pError || !profile) {
        response = `END Error: Phone number ${phoneNumber} not registered in PFA system.`;
      } else {
        // Fetch wallet balance
        const { data: wallet, error: wError } = await db
          .from('wallets')
          .select('balance')
          .eq('profile_id', profile.id)
          .single();

        if (wError || !wallet) {
          response = `END Error: Wallet not found for ${profile.full_name}.`;
        } else {
          response = `END Hello ${profile.full_name}, your current relief balance is KES ${wallet.balance.toLocaleString()}.
Thank you for using PFA.`;
        }
      }
    } catch (err) {
      response = `END System error. Please try again later.`;
    }
  } else if (text === "2") {
    response = `CON Enter Voucher Code:`;
  } else if (text === "3") {
    response = `END Help is on the way. A volunteer has been notified of your location.`;
  } else if (text.startsWith("2*")) {
    const voucherCode = text.split("*")[1];
    response = `END Voucher ${voucherCode} redeemed successfully!
KES 2,500 added to your wallet.`;
  } else {
    response = `END Invalid option. Please try again.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

export function normalizePhone(phone: string): string {
  const trimmed = (phone || "").trim();
  // Remove all spaces, tabs, and other whitespace characters from phone numbers.
  const cleaned = trimmed.replace(/\s+/g, '');
  
  // Preserve the leading + if present.
  let normalized = cleaned;
  
  // If the number starts with 07, convert it to +2547...
  if (cleaned.startsWith('07')) {
    normalized = '+254' + cleaned.slice(1);
  } else if (cleaned.startsWith('254') && !cleaned.startsWith('+')) {
    // If the number starts with 254, convert it to +254...
    normalized = '+' + cleaned;
  }
  
  // Add logging to show: Original phone number, Normalized phone number
  console.log(`[normalizePhone] Original: "${phone}" => Normalized: "${normalized}"`);
  return normalized;
}

// SMS Endpoint (Proxy for frontend)
app.post("/api/sms", async (req, res) => {
  try {
    const { to, message, apiKey, username, senderId } = req.body;
    
    // Normalize phone format using the reusable normalizePhone function immediately before sending
    const formattedTo = normalizePhone(to);

    // Try Africa's Talking first
    const finalApiKey = apiKey || process.env.AFRICAS_TALKING_API_KEY || process.env.AFRICA_S_TALKING_API_KEY;
    const finalUsername = username || process.env.AFRICAS_TALKING_USERNAME || process.env.AFRICA_S_TALKING_USERNAME || 'sandbox';

    if (finalApiKey) {
      try {
        const sms = getAtSms(apiKey, username);
        if (sms) {
          const sendOptions: any = { to: formattedTo, message };
          const finalSenderId = senderId || process.env.AFRICAS_TALKING_SENDER_ID || process.env.AFRICA_S_TALKING_SENDER_ID;
          if (finalSenderId) {
            sendOptions.from = finalSenderId;
            console.log(`Sending SMS via AT with custom Sender ID: "${finalSenderId}"`);
          } else {
            console.log("Sending SMS via AT with default route or shared shortcode");
          }

          console.log(`Calling Africa's Talking sms.send to: "${formattedTo}" using username: "${finalUsername}"`);
          const result = await sms.send(sendOptions);
          console.log("Africa's Talking Raw Response Payload:", JSON.stringify(result));

          // Inspect the individual recipient status to verify delivery acceptance
          let deliveryFailure = null;
          if (result && result.SMSMessageData && result.SMSMessageData.Recipients && result.SMSMessageData.Recipients.length > 0) {
            const firstRecipient = result.SMSMessageData.Recipients[0];
            const status = firstRecipient.status;
            const statusCode = firstRecipient.statusCode;
            const number = firstRecipient.number;

            // Common success code for AT is 101. If not success, parse reason
            if (status !== "Success" && statusCode !== 101) {
              let explanation = `Delivery Status: "${status}" (Code ${statusCode}). `;
              if (statusCode === 402) {
                explanation += "Insufficient Balance on your Africa's Talking Bulk SMS account. Please top up your account balance.";
              } else if (statusCode === 403) {
                explanation += "Unauthorized or rejected. In Sandbox mode, you can ONLY send messages to phone numbers whitelisted/registered in your Sandbox Teams list!";
              } else if (statusCode === 401) {
                explanation += "Incorrect or invalid Africa's Talking credentials (API Key or Username).";
              } else if (status === "InvalidPhoneNumber") {
                explanation += "Invalid phone number format. Ensure the number is active and in (+254...) format.";
              } else {
                explanation += "Please verify your account balance, sender ID whitelist registration, and that the phone number is active.";
              }
              deliveryFailure = explanation;
            }
          } else {
            deliveryFailure = "Did not receive empty or valid recipient tracking info from Africa's Talking API.";
          }

          if (deliveryFailure) {
            console.error("SMS Delivery Failure:", deliveryFailure);
            const isSandbox = finalUsername.toLowerCase() === 'sandbox';
            return res.json({ 
              success: false, 
              error: deliveryFailure, 
              warning: deliveryFailure,
              isSandbox: isSandbox,
              provider: 'africastalking', 
              result 
            });
          }

          console.log("SMS Sent Successfully via Africa's Talking Client!");
          return res.json({ success: true, provider: 'africastalking', result });
        }
      } catch (error: any) {
        console.error("Africa's Talking SMS API Execution Error:", error);
        return res.json({ 
          success: false, 
          error: `Africa's Talking Request Failed: ${error.message || error}`, 
          provider: 'africastalking' 
        });
      }
    }

    // Try Twilio as fallback
    const client = getTwilioClient();
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const result = await client.messages.create({
          body: message,
          to: to,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        return res.json({ success: true, provider: 'twilio', result });
      } catch (error) {
        console.error("Twilio SMS Error:", error);
        return res.status(500).json({ success: false, error: "Both SMS providers failed or were not configured correctly." });
      }
    }

    res.status(400).json({ success: false, error: "No SMS provider configured. Make sure AFRICA_S_TALKING_API_KEY or TWILIO credentials are set." });
  } catch (globalError: any) {
    console.error("Global /api/sms runtime error:", globalError);
    res.status(500).json({ 
      success: false, 
      error: `API Internal Server Error: ${globalError.message || globalError}`,
      stack: globalError.stack 
    });
  }
});

export { app };
