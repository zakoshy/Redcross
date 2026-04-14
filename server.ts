import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createRequire } from "module";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
dotenv.config();

let atSms: any = null;
let twilioClient: any = null;

function getAtSms() {
  if (!atSms) {
    try {
      const africastalking = require("africastalking");
      const at = africastalking({
        apiKey: process.env.AFRICA_S_TALKING_API_KEY || '',
        username: process.env.AFRICA_S_TALKING_USERNAME || 'sandbox'
      });
      atSms = at.SMS;
    } catch (error) {
      console.error("Failed to initialize Africa's Talking:", error);
    }
  }
  return atSms;
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
  app.post("/api/ussd", (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    let response = "";

    if (text === "") {
      // This is the first request. Note how we start the response with CON
      response = `CON Welcome to PFA Aid System
1. Check Balance
2. Redeem Voucher
3. Emergency Support`;
    } else if (text === "1") {
      // Logic to check balance from Supabase would go here
      // For now, a placeholder
      response = `END Your current balance is KES 5,000.
Thank you for using PFA.`;
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
    
    // Try Africa's Talking first
    if (process.env.AFRICA_S_TALKING_API_KEY) {
      try {
        const sms = getAtSms();
        if (sms) {
          const result = await sms.send({ to, message });
          return res.json({ success: true, provider: 'africastalking', result });
        }
      } catch (error) {
        console.error("Africa's Talking SMS Error:", error);
        // If AT fails, we fall through to Twilio if available
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

    res.status(400).json({ success: false, error: "No SMS provider configured." });
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
