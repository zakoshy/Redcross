import { NextResponse } from "next/server";
import africastalking from "africastalking";
import twilio from "twilio";

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
    console.log(`[SMS API] Constructing Africa's Talking SMS instance with username: "${username}" (API Key size: ${apiKey ? apiKey.length : 0})`);
    
    const atConstructor = (africastalking as any).default || africastalking;
    const at = atConstructor({
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
      const twilioConstructor = (twilio as any).default || twilio;
      twilioClient = twilioConstructor(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (error) {
      console.error("Failed to initialize Twilio:", error);
    }
  }
  return twilioClient;
}

export function normalizePhone(phone: string): string {
  const trimmed = (phone || "").trim();
  const cleaned = trimmed.replace(/\s+/g, '');
  
  let normalized = cleaned;
  
  if (cleaned.startsWith('07')) {
    normalized = '+254' + cleaned.slice(1);
  } else if (cleaned.startsWith('254') && !cleaned.startsWith('+')) {
    normalized = '+' + cleaned;
  }
  
  console.log(`[normalizePhone] Original: "${phone}" => Normalized: "${normalized}"`);
  return normalized;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, message, apiKey, username, senderId } = body;

    const formattedTo = normalizePhone(to);

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

          let deliveryFailure = null;
          if (result && result.SMSMessageData && result.SMSMessageData.Recipients && result.SMSMessageData.Recipients.length > 0) {
            const firstRecipient = result.SMSMessageData.Recipients[0];
            const status = firstRecipient.status;
            const statusCode = firstRecipient.statusCode;

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
            return NextResponse.json({ 
              success: false, 
              error: deliveryFailure, 
              warning: deliveryFailure,
              isSandbox: isSandbox,
              provider: 'africastalking', 
              result 
            });
          }

          console.log("SMS Sent Successfully via Africa's Talking Client!");
          return NextResponse.json({ success: true, provider: 'africastalking', result });
        }
      } catch (error: any) {
        console.error("Africa's Talking SMS API Execution Error:", error);
        return NextResponse.json({ 
          success: false, 
          error: `Africa's Talking Request Failed: ${error.message || error}`, 
          provider: 'africastalking' 
        });
      }
    }

    const client = getTwilioClient();
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const result = await client.messages.create({
          body: message,
          to: to,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        return NextResponse.json({ success: true, provider: 'twilio', result });
      } catch (error) {
        console.error("Twilio SMS Error:", error);
        return NextResponse.json({ success: false, error: "Both SMS providers failed or were not configured correctly." }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: "No SMS provider configured. Make sure AFRICA_S_TALKING_API_KEY or TWILIO credentials are set." }, { status: 450 });
  } catch (globalError: any) {
    console.error("Global /api/sms runtime error:", globalError);
    return NextResponse.json({ 
      success: false, 
      error: `API Internal Server Error: ${globalError.message || globalError}`,
      stack: globalError.stack 
    }, { status: 500 });
  }
}
