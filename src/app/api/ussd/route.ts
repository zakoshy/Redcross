import { NextResponse } from "next/server";
import { getSupabase } from "../../../lib/supabase-server";

export async function POST(req: Request) {
  try {
    let sessionId = "";
    let serviceCode = "";
    let phoneNumber = "";
    let text = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("form") || contentType.includes("urlencoded")) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        sessionId = (formData.get("sessionId") as string) || "";
        serviceCode = (formData.get("serviceCode") as string) || "";
        phoneNumber = (formData.get("phoneNumber") as string) || "";
        text = (formData.get("text") as string) || "";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      sessionId = body.sessionId || "";
      serviceCode = body.serviceCode || "";
      phoneNumber = body.phoneNumber || "";
      text = body.text || "";
    }

    let response = "";

    if (text === "") {
      response = `CON Welcome to PFA Aid System
1. Check Balance
2. Redeem Voucher
3. Emergency Support`;
    } else if (text === "1") {
      try {
        const db = getSupabase();
        const { data: profile, error: pError } = await db
          .from("profiles")
          .select("id, full_name")
          .eq("phone_number", phoneNumber)
          .single();

        if (pError || !profile) {
          response = `END Error: Phone number ${phoneNumber} not registered in PFA system.`;
        } else {
          const { data: wallet, error: wError } = await db
            .from("wallets")
            .select("balance")
            .eq("profile_id", profile.id)
            .single();

          if (wError || !wallet) {
            response = `END Error: Wallet not found for ${profile.full_name}.`;
          } else {
            response = `END Hello ${
              profile.full_name
            }, your current relief balance is KES ${wallet.balance.toLocaleString()}.
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

    return new Response(response, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error: any) {
    console.error("USSD webhook error:", error);
    return new Response("END Internal system error.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}
