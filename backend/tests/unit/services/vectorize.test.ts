/**
 * Task 26: VectorizeService — userId isolation in searchVectors
 *
 * Focuses on the scenarios NOT covered by the legacy tests/services/vectorize.test.ts:
 * - Explicit cross-user isolation: alice's search must not return bob's vectors
 * - Metadata-level filtering behaviour is confirmed
 *
 * fetch is mocked with vi.stubGlobal so no real HTTP calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorizeService } from '../../../src/services/vectorize';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatchesResponse(
  matches: Array<{ id: string; score: number; userId: string; content: string }>
) {
  return {
    ok: true,
    json: async () => ({
      matches: matches.map((m) => ({
        id: m.id,
        score: m.score,
        metadata: { userId: m.userId, content: m.content },
      })),
    }),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VectorizeService — userId isolation in searchVectors', () => {
  let service: VectorizeService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new VectorizeService('acct-test', 'token-test');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Core isolation scenario
  // -------------------------------------------------------------------------

  it('alice search returns only alice vectors, not bob vectors', async () => {
    // API returns mixed results for alice and bob
    fetchMock.mockResolvedValueOnce(
      makeMatchesResponse([
        { id: 'note-alice-1', score: 0.95, userId: 'alice', content: 'Alice budget plan' },
        { id: 'note-bob-1', score: 0.93, userId: 'bob', content: 'Bob spending record' },
        { id: 'note-alice-2', score: 0.88, userId: 'alice', content: 'Alice savings goal' },
        { id: 'note-bob-2', score: 0.82, userId: 'bob', content: 'Bob salary info' },
      ])
    );

    const embedding = [0.1, 0.2, 0.3];
    const results = await service.searchVectors(embedding, 'user_notes', 10, 'alice');

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(['note-alice-1', 'note-alice-2']);
    expect(results.every((r) => r.content.startsWith('Alice'))).toBe(true);
  });

  it('bob search returns only bob vectors, not alice vectors', async () => {
    fetchMock.mockResolvedValueOnce(
      makeMatchesResponse([
        { id: 'note-alice-1', score: 0.97, userId: 'alice', content: 'Alice data' },
        { id: 'note-bob-1', score: 0.90, userId: 'bob', content: 'Bob data' },
      ])
    );

    const results = await service.searchVectors([0.1, 0.2, 0.3], 'user_notes', 10, 'bob');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-bob-1');
    expect(results[0].content).toBe('Bob data');
  });

  it('returns empty array when there are no matches for the requested userId', async () => {
    fetchMock.mockResolvedValueOnce(
      makeMatchesResponse([
        { id: 'note-alice-1', score: 0.99, userId: 'alice', content: 'Alice only' },
      ])
    );

    const results = await service.searchVectors([0.1, 0.2], 'user_notes', 10, 'charlie');

    expect(results).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // No userId = no filtering (shared knowledge base scenario)
  // -------------------------------------------------------------------------

  it('without userId all results are returned', async () => {
    fetchMock.mockResolvedValueOnce(
      makeMatchesResponse([
        { id: 'kb-1', score: 0.9, userId: 'alice', content: 'shared knowledge' },
        { id: 'kb-2', score: 0.8, userId: 'bob', content: 'more knowledge' },
      ])
    );

    const results = await service.searchVectors([0.1, 0.2], 'knowledge_base', 10);

    expect(results).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // Limit still applies after userId filter
  // -------------------------------------------------------------------------

  it('limit is enforced after userId filter', async () => {
    fetchMock.mockResolvedValueOnce(
      makeMatchesResponse([
        { id: 'a-1', score: 0.99, userId: 'alice', content: 'A1' },
        { id: 'a-2', score: 0.95, userId: 'alice', content: 'A2' },
        { id: 'b-1', score: 0.93, userId: 'bob', content: 'B1' },
        { id: 'a-3', score: 0.90, userId: 'alice', content: 'A3' },
      ])
    );

    // limit=2, userId=alice → 3 alice results after filter → should be sliced to 2
    const results = await service.searchVectors([0.1, 0.2], 'user_notes', 2, 'alice');

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('a-1');
    expect(results[1].id).toBe('a-2');
  });

  // -------------------------------------------------------------------------
  // Graceful handling of missing metadata
  // -------------------------------------------------------------------------

  it('result with no metadata passes through when no userId filter', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [{ id: 'no-meta', score: 0.7 }],
      }),
    });

    const results = await service.searchVectors([0.1, 0.2], 'knowledge_base', 10);

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('');
  });

  it('result with no metadata passes through userId filter (metadata absent = not filtered)', async () => {
    // Source code logic: filter returns true when match.metadata is falsy (no metadata),
    // so results without metadata are NOT excluded — they pass through.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matches: [
          { id: 'no-meta', score: 0.7 },
          { id: 'with-meta', score: 0.6, metadata: { userId: 'alice', content: 'Alice item' } },
        ],
      }),
    });

    const results = await service.searchVectors([0.1, 0.2], 'user_notes', 10, 'alice');

    // Both pass through: no-meta (metadata is absent → filter passes), with-meta (userId matches)
    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.id);
    expect(ids).toContain('no-meta');
    expect(ids).toContain('with-meta');
  });

  // -------------------------------------------------------------------------
  // Empty embedding early-return (no fetch call)
  // -------------------------------------------------------------------------

  it('returns empty array immediately for empty embedding without calling fetch', async () => {
    const results = await service.searchVectors([], 'user_notes', 10, 'alice');

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Scores are normalised to 0-1
  // -------------------------------------------------------------------------

  it('normalises out-of-range scores to 0-1 for alice results', async () => {
    fetchMock.mockResolvedValueOnce(
      makeMatchesResponse([
        { id: 'over', score: 1.5, userId: 'alice', content: 'over' },
        { id: 'under', score: -0.3, userId: 'alice', content: 'under' },
      ])
    );

    const results = await service.searchVectors([0.1], 'user_notes', 10, 'alice');

    expect(results[0].score).toBe(1);
    expect(results[1].score).toBe(0);
  });
});
