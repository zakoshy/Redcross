import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createRequire } from "module";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

let atSms: any = null;

function getAtSms() {
  if (!atSms) {
    try {
      const africastalking = require("africastalking");
      const username = process.env.AFRICA_S_TALKING_USERNAME || 'sandbox';
      console.log(`Initializing Africa's Talking with username: "${username}"`);
      const at = africastalking({
        apiKey: process.env.AFRICA_S_TALKING_API_KEY || '',
        username: username
      });
      atSms = at.SMS;
    } catch (error) {
      console.error("Failed to initialize Africa's Talking:", error);
    }
  }
  return atSms;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Starting server...");

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
      // This is the first request. Note how we start the response with CON
      response = `CON Welcome to PFA Aid System
1. Check Balance
2. Redeem Voucher
3. Emergency Support`;
    } else if (text === "1") {
      try {
        // Fetch profile by phone number
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('phone_number', phoneNumber)
          .single();

        if (pError || !profile) {
          response = `END Error: Phone number ${phoneNumber} not registered in PFA system.`;
        } else {
          // Fetch wallet balance
          const { data: wallet, error: wError } = await supabase
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

  // SMS Endpoint (Proxy for frontend)
  app.post("/api/sms", async (req, res) => {
    const { to, message } = req.body;
    
    // Check if configuration exists
    if (!process.env.AFRICA_S_TALKING_API_KEY) {
      return res.status(400).json({ 
        success: false, 
        error: "Africa's Talking SMS API is not configured (missing AFRICA_S_TALKING_API_KEY)." 
      });
    }

    try {
      const sms = getAtSms();
      if (!sms) {
        return res.status(500).json({ 
          success: false, 
          error: "Failed to initialize Africa's Talking SMS library." 
        });
      }

      const sendOptions: any = { to, message };
      const username = process.env.AFRICA_S_TALKING_USERNAME || 'sandbox';
      const isSandbox = username.toLowerCase() === 'sandbox';

      // In sandbox mode, custom Sender IDs are not allowed unless configured, so default to standard routing
      if (process.env.AFRICA_S_TALKING_SENDER_ID && !isSandbox) {
        sendOptions.from = process.env.AFRICA_S_TALKING_SENDER_ID;
        console.log(`Sending SMS via AT with custom Sender ID: "${process.env.AFRICA_S_TALKING_SENDER_ID}"`);
      } else {
        console.log("Sending SMS via AT with default route or shared shortcode (Sender ID bypassed for Sandbox)");
      }

      console.log(`Calling Africa's Talking sms.send to: "${to}"`);
      const result = await sms.send(sendOptions);
      console.log("Africa's Talking Raw Response Payload:", JSON.stringify(result));

      // Inspect individual recipient status to verify delivery acceptance
      let deliveryFailure = null;
      if (result && result.SMSMessageData && result.SMSMessageData.Recipients && result.SMSMessageData.Recipients.length > 0) {
        const firstRecipient = result.SMSMessageData.Recipients[0];
        const status = firstRecipient.status;
        const statusCode = firstRecipient.statusCode;

        // Common success code for AT is 101. If not success, parse reason
        if (status !== "Success" && statusCode !== 101) {
          let explanation = `Delivery Status: "${status}" (Code ${statusCode}). `;
          if (statusCode === 402) {
            explanation += "This means your Africa's Talking Bulk SMS account has INSUFFICIENT BALANCE. Please top up your account balance.";
          } else if (statusCode === 403) {
            explanation += "This number is unauthorized or rejected. Note that on the Africa's Talking Sandbox environment, you can ONLY send messages to phone numbers registered in your Sandbox Teams list!";
          } else if (statusCode === 401) {
            explanation += "Incorrect or invalid credentials.";
          } else if (status === "InvalidPhoneNumber") {
            explanation += "The phone number format is invalid. Make sure it is in international format (e.g. +254712345678).";
          } else {
            explanation += "Please verify your account balance, sender ID whitelist registration, and that phone number is active.";
          }
          deliveryFailure = explanation;
        }
      } else {
        deliveryFailure = "Did not receive empty or valid recipient tracking info from Africa's Talking API.";
      }

      if (deliveryFailure) {
        console.error("SMS Delivery Failure:", deliveryFailure);
        return res.status(400).json({ success: false, error: deliveryFailure, result });
      }

      console.log("SMS Sent Successfully via Africa's Talking Client!");
      return res.json({ success: true, provider: 'africastalking', result });

    } catch (error: any) {
      console.error("Africa's Talking SMS API Execution Error:", error);
      const errMessage = error.message || error;
      return res.status(500).json({ 
        success: false, 
        error: `Africa's Talking API Error: "${errMessage}"` 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.promises.readFile(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
