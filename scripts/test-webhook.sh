#!/bin/bash

# ============================================
# Mayar Webhook Test Script for Fastpik
# ============================================
# Usage: ./scripts/test-webhook.sh [plan] [email]
# Plans: monthly, quarterly, yearly, lifetime
# Example: ./scripts/test-webhook.sh monthly test@example.com

WEBHOOK_URL="https://fastpik.ryanekoapp.web.id/api/webhooks/mayar"

# Default values
PLAN=${1:-"monthly"}
EMAIL=${2:-"test@example.com"}
NAME="Test User"
TRANSACTION_ID="TRX-$(date +%s)-TEST"

# Determine amount based on plan
case $PLAN in
    "monthly"|"1")
        AMOUNT=15000
        PLAN_NAME="Pro Monthly (1 Bulan)"
        ;;
    "quarterly"|"3")
        AMOUNT=39000
        PLAN_NAME="Pro Quarterly (3 Bulan)"
        ;;
    "yearly"|"12")
        AMOUNT=149000
        PLAN_NAME="Pro Yearly (1 Tahun)"
        ;;
    "lifetime"|"∞")
        AMOUNT=349000
        PLAN_NAME="Pro Lifetime"
        ;;
    *)
        echo "❌ Unknown plan: $PLAN"
        echo "Available plans: monthly, quarterly, yearly, lifetime"
        exit 1
        ;;
esac

echo "============================================"
echo "🧪 Mayar Webhook Test"
echo "============================================"
echo "📧 Email: $EMAIL"
echo "📦 Plan: $PLAN_NAME"
echo "💰 Amount: Rp $AMOUNT"
echo "🔗 URL: $WEBHOOK_URL"
echo "🆔 Transaction: $TRANSACTION_ID"
echo "============================================"
echo ""

# Build JSON payload
PAYLOAD=$(cat <<EOF
{
    "id": "$TRANSACTION_ID",
    "transaction_id": "$TRANSACTION_ID",
    "status": "success",
    "transaction_status": "settlement",
    "amount": $AMOUNT,
    "gross_amount": $AMOUNT,
    "customer": {
        "name": "$NAME",
        "email": "$EMAIL"
    },
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "payment_method": "test_script"
}
EOF
)

echo "📤 Sending webhook..."
echo ""

# Send request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

# Extract body and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "============================================"
echo "📬 Response"
echo "============================================"
echo "Status Code: $HTTP_CODE"
echo "Body: $BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Webhook sent successfully!"
else
    echo "❌ Webhook failed with status $HTTP_CODE"
fi
