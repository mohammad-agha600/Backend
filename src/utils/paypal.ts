import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

const Environment =
  process.env.NODE_ENV === 'production'
    ? checkoutNodeJssdk.core.LiveEnvironment
    : checkoutNodeJssdk.core.SandboxEnvironment;

const paypalEnv = new Environment(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_CLIENT_SECRET!
);

const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(paypalEnv);

export default paypalClient;
