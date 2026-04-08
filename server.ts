import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import africastalking from "africastalking";
import dotenv from "dotenv";

dotenv.config();

const at = africastalking({
  apiKey: process.env.AFRICA_S_TALKING_API_KEY || '',
  username: process.env.AFRICA_S_TALKING_USERNAME || 'sandbox'
});

const sms = at.SMS;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  // Africa's Talking SMS Endpoint (Proxy for frontend)
  app.post("/api/sms", async (req, res) => {
    const { to, message } = req.body;
    try {
      const result = await sms.send({ to, message });
      res.json({ success: true, result });
    } catch (error) {
      console.error("SMS Error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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

startServer();
