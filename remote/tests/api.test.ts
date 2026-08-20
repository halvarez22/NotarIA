import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as SearchPOST } from '../src/app/api/search/route';
import { POST as DownloadPOST } from '../src/app/api/download/route';
import axios from 'axios';

// Mock dependencies
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn()
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: vi.fn()
}));

vi.mock('axios');

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

describe('Remote API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOMIC_API_KEY = 'fake_nomic_key';
  });

  describe('/api/search', () => {
    it('returns 401 if unauthorized', async () => {
      (createClient as any).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
      });

      const req = new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'test' })
      });

      const res = await SearchPOST(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and search results for valid query', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user1' } } }) },
        rpc: vi.fn().mockResolvedValue({ data: [{ id: 1, content: 'result' }], error: null })
      };
      (createClient as any).mockResolvedValue(mockSupabase);
      
      (axios.post as any).mockResolvedValue({
        data: { embeddings: [[0.1, 0.2, 0.3]] }
      });

      const req = new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'contrato' })
      });

      const res = await SearchPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results[0].content).toBe('result');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_documents', expect.objectContaining({
        query_embedding: [0.1, 0.2, 0.3]
      }));
    });
  });

  describe('/api/download', () => {
    it('returns 401 if unauthorized', async () => {
      (createClient as any).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
      });

      const req = new Request('http://localhost/api/download', {
        method: 'POST',
        body: JSON.stringify({ storage_path: 'test.pdf' })
      });

      const res = await DownloadPOST(req);
      expect(res.status).toBe(401);
    });

    it('generates a signed URL for valid request', async () => {
      (createClient as any).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user1' } } }) }
      });

      const mockServiceClient = {
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://fake-url.com' }, error: null })
          })
        }
      };
      (createServiceClient as any).mockReturnValue(mockServiceClient);

      const req = new Request('http://localhost/api/download', {
        method: 'POST',
        body: JSON.stringify({ storage_path: 'path/to/doc.pdf' })
      });

      const res = await DownloadPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.signedUrl).toBe('https://fake-url.com');
    });
  });
});
