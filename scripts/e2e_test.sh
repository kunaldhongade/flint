#!/bin/bash
set -e

echo "Waiting for services to be ready..."
sleep 5

echo "1. Checking Backend Health..."
if curl -s http://localhost:3333/health | grep "ok"; then
    echo "Backend OK"
else
    echo "Backend Failed"
    exit 1
fi

echo "2. Checking AI Health..."
if curl -s http://localhost:8888/health | grep "ok"; then
    echo "AI Service OK"
else
    echo "AI Service Failed"
    exit 1
fi

echo "3. Testing /api/decision/allocate (Backend -> AI Integration)..."
RESPONSE=$(curl -s -X POST http://localhost:3333/api/decision/allocate \
  -H "Content-Type: application/json" \
  -H "x-api-key: flint-staging-key-123" \
  -d '{
    "userId": "test-user-1",
    "asset": "FLR",
    "amount": "1000",
    "opportunities": [
        { "protocol": "Enosys", "asset": "FLR", "apy": 5.5, "tvl": 5000000 },
        { "protocol": "Kinetic", "asset": "FLR", "apy": 6.2, "tvl": 2000000 }
    ]
  }')

echo "Response received:"
echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "decision"; then
    echo "✅ E2E Test Passed: Decision received."
else
    echo "❌ E2E Test Failed: No decision in response."
    exit 1
fi
