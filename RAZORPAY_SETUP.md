# Razorpay Payment Integration - EduSnap

## Overview
EduSnap uses **Razorpay** for secure online payment processing. This guide covers setup, testing, and deployment.

## Features Supported
- ✅ Credit Cards (Visa, MasterCard, American Express)
- ✅ Debit Cards
- ✅ UPI (Unified Payments Interface)
- ✅ Net Banking
- ✅ Digital Wallets (Paytm, Amazon Pay, etc.)
- ✅ Mobile Wallets

## Prerequisites
- Razorpay Account (Business)
- API Keys (Key ID & Key Secret)
- HTTPS enabled for production

## Step 1: Create Razorpay Account

1. Visit [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Click "Sign Up"
3. Enter email and password
4. Verify email
5. Complete KYC (Know Your Customer) verification
6. Activate your business account

## Step 2: Get API Keys

### From Razorpay Dashboard
1. Go to Settings → API Keys
2. You'll see two sections:
   - **Key ID** (public key)
   - **Key Secret** (private key - keep this secure!)

3. Copy both keys

### Example Keys (DO NOT USE IN PRODUCTION)
```
Key ID: rzp_test_xxxxxxxxxxxxxxxx
Key Secret: xxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Configure Backend

Update `backend/.env`:
```env
# Payment Configuration (Razorpay)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

## Step 4: Payment Flow

### Architecture
```
User Creates Booking
    ↓
User Clicks "Pay Now"
    ↓
Payment Page (payment.html)
    ↓
POST /api/payments/order
    ↓
Backend creates Razorpay Order
    ↓
Razorpay Checkout Modal Opens
    ↓
User completes payment on Razorpay
    ↓
POST /api/payments/verify
    ↓
Verify payment signature
    ↓
Update payment status in DB
    ↓
Send confirmation email
    ↓
Redirect to booking history
```

### Database Tables
1. **Payment** - Stores payment records
   - orderId (Razorpay Order ID)
   - paymentId (Razorpay Payment ID)
   - amount (in INR)
   - status (created, authorized, captured, failed, refunded)
   - paymentSignature (for verification)

2. **Booking** - Updated with payment info
   - paymentStatus
   - paymentId

## API Endpoints

### 1. Create Payment Order
**POST** `/api/payments/order`

Request:
```json
{
  "bookingId": "booking_id_here"
}
```

Response:
```json
{
  "message": "Payment order created",
  "orderId": "order_xxxxxxxxxxxx",
  "amount": 500,
  "currency": "INR",
  "keyId": "rzp_test_xxxxx"
}
```

### 2. Verify Payment
**POST** `/api/payments/verify`

Request:
```json
{
  "orderId": "order_xxxxxxxxxxxx",
  "paymentId": "pay_xxxxxxxxxxxx",
  "signature": "signature_here"
}
```

Response:
```json
{
  "message": "Payment verified successfully",
  "payment": {
    "paymentId": "pay_xxxxxxxxxxxx",
    "status": "captured",
    "method": "card"
  }
}
```

### 3. Get Payment Status
**GET** `/api/payments/:bookingId`

Response:
```json
{
  "payment": {
    "paymentId": "pay_xxxxxxxxxxxx",
    "status": "captured",
    "amount": 500,
    "method": "card"
  }
}
```

### 4. Refund Payment
**POST** `/api/payments/:bookingId/refund`

Request (optional):
```json
{
  "reason": "Booking cancelled by tutor"
}
```

Response:
```json
{
  "message": "Refund processed successfully",
  "refund": {
    "refundId": "rfnd_xxxxxxxxxxxx",
    "amount": 500,
    "status": "processed"
  }
}
```

## Testing

### Test Cards
Use these card numbers in TEST mode:

**Successful Payment:**
- Card: `4111111111111111`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)

**Failed Payment:**
- Card: `4000000000000002`
- Expiry: Any future date
- CVV: Any 3 digits

### Test Steps
1. Create a booking
2. Click "Proceed to Payment"
3. Use test card numbers above
4. Complete payment in Razorpay modal
5. Verify payment in dashboard

### Testing in Dashboard
1. Go to Razorpay Dashboard
2. Look for test transactions in Transactions section
3. Verify order and payment records

## Important: Signature Verification

**Security:** Always verify the signature server-side!

```javascript
// Backend verification (Node.js)
const crypto = require('crypto');

function verifySignature(orderId, paymentId, signature) {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}
```

## Moving to Production

### 1. Get Live Keys
1. Go to Razorpay Dashboard → Settings → API Keys
2. Switch from "Test" to "Live"
3. Copy Live Key ID and Key Secret

### 2. Update Environment
Update `backend/.env`:
```env
RAZORPAY_KEY_ID=rzp_live_your_live_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
```

### 3. Enable HTTPS
- Install SSL certificate
- Update payment.html to use HTTPS URLs
- Razorpay requires HTTPS for live payments

### 4. Update Domain
- Add your domain to Razorpay Whitelisted Domain settings
- Some payment methods require this

### 5. Testing Before Going Live
1. Process a test transaction with small amount (₹1-10)
2. Verify all email notifications
3. Test refund flow
4. Test with different payment methods

## Webhook Setup (Optional)

For real-time payment updates, setup webhooks:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Enter webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Subscribe to events:
   - `payment.authorized`
   - `payment.failed`
   - `refund.created`
4. Create webhook handler in `backend/routes/webhooks.js`

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid API key | Wrong key in .env | Verify keys in Razorpay dashboard |
| Signature mismatch | Order tampered | Check signature verification code |
| Payment declined | Card declined | Test with valid test cards |
| Order not found | Order doesn't exist | Create order before payment |

## Security Best Practices

1. **Never expose Key Secret**
   - Only use in backend
   - Never commit to public repos
   - Use .env files

2. **Always verify signatures**
   - Verify on server-side
   - Don't trust client-side verification

3. **HTTPS only**
   - Enforce HTTPS in production
   - Razorpay requires this

4. **Rate limiting**
   - Implement rate limiting on payment endpoints
   - Prevent payment bombing

5. **Logging**
   - Log all payment attempts
   - Keep logs for audit trail

## Troubleshooting

### Payments not showing in dashboard
- Check if using test or live keys
- Verify API keys are correct
- Check payment status in DB

### Signature verification failing
- Verify you're using correct Key Secret
- Check order ID and payment ID format
- Ensure UTF-8 encoding

### Refunds not processing
- Check refund limits (default: 100% within 365 days)
- Verify payment was captured (not just authorized)
- Check Razorpay account balance/settlements

## Support
- Documentation: https://razorpay.com/docs
- Status: https://status.razorpay.com
- Support: https://razorpay.com/support

---

**Last Updated:** April 17, 2026  
**Integration Version:** Razorpay 2.x  
**Maintained by:** EduSnap Development Team
