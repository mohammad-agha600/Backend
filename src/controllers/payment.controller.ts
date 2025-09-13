import { Request, Response } from 'express';
import paypalClient from '../utils/paypal.js';
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

// Extend PayPal types for readability
const PayPalOrdersCreateRequest = checkoutNodeJssdk.orders.OrdersCreateRequest;
const PayPalOrdersCaptureRequest = checkoutNodeJssdk.orders.OrdersCaptureRequest;

// Create PayPal Order
export const createPaypalOrder = async (req: Request, res: Response) => {
  const { amount } = req.body as { amount: number };

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  const request = new PayPalOrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "PKR",
          value: amount.toFixed(2), // Format to string with 2 decimals
        },
      },
    ],
  });

  try {
    const order = await paypalClient.execute(request);
    res.status(200).json({ success: true, id: order.result.id });
  } catch (error) {
    console.error("PayPal order creation error:", error);
    res.status(500).json({ success: false, message: "PayPal order creation failed" });
  }
};

// Capture PayPal Payment
export const capturePaypalPayment = async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Missing PayPal order ID" });
  }

  const request = new PayPalOrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);
    res.status(200).json({ success: true, details: capture.result });
  } catch (error) {
    console.error("PayPal capture error:", error);
    res.status(500).json({ success: false, message: "PayPal payment capture failed" });
  }
};
