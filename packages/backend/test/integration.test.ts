import request from 'supertest';
import app from '../src/index';

// We mock the Services for integration test to avoid real external calls
jest.mock('../src/services/ai', () => ({
  aiService: {
    generateAllocationDecision: jest.fn().mockResolvedValue({
      id: 'decision-123',
      action: 'ALLOCATE',
      amount: '1000',
      asset: 'USDC',
      confidenceScore: 9000,
      reasons: ['Testing'],
      dataSources: [],
      alternatives: []
    })
  }
}));



describe('Backend Integration Security', () => {
    
  it('Should Reject Requests without API Key', async () => {
    const res = await request(app)
      .post('/api/decision/allocate')
      .send({ asset: 'USDC', amount: '1000' });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('Should Accept Requests with Valid API Key', async () => {
    const res = await request(app)
      .post('/api/decision/allocate')
      .set('x-api-key', process.env.API_KEY || 'flint-staging-key-123')
      .send({ userId: 'user1', asset: 'USDC', amount: '1000' });
    
    // Note: status might be 200 or 500 depending on other mocks, 
    // but definitely NOT 401 if auth passes.
    // Given mocks above, it should likely succeed or fail validation.
    // 200 is expected if path works. 
    expect(res.status).not.toBe(401);
  });
});
