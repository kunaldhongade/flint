
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend .env
dotenv.config({ path: path.join(__dirname, '../packages/backend/.env') });

const API_KEY = process.env.API_KEY || 'f2f896e1e2b5a0654383912a7e07c153e7ad53c1f7f19c6b65bec1d334117ba0';
const BACKEND_URL = 'http://localhost:3333/api';

async function testDecisionFlow() {
  console.log('🚀 Starting End-to-End Flow Test');
  console.log(`Target Backend: ${BACKEND_URL}`);

  try {
    // 1. Health Check
    console.log('\n[1] Checking Health...');
    const health = await axios.get('http://localhost:3333/health');
    console.log('✅ Health OK:', health.data);

    // 2. Request Decision
    console.log('\n[2] Requesting AI Decision...');
    const payload = {
      userId: 'test_user_1',
      asset: 'fUSD',
      amount: '1000',
      opportunities: [
        {
          id: 'mock-opp-1',
          protocol: 'Aave',
          asset: 'fUSD',
          apy: 5.5,
          riskScore: 2,
          tvl: 1000000,
          source: 'MANUAL',
          lastUpdated: new Date().toISOString()
        }
      ]
    };

    const response = await axios.post(`${BACKEND_URL}/decision/allocate`, payload, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Decision Received:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.attestation) {
      console.log('✅ Attestation Present');
    } else {
      console.error('❌ Missing Attestation');
    }

  } catch (error: any) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
  }
}

testDecisionFlow();
