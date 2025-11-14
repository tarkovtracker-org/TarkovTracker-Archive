import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { createTestSuite } from '../../helpers';
interface MockResponse {
  status: Mock<(code: number) => MockResponse>;
  json: Mock<(data: any) => MockResponse>;
  send: Mock<(data: any) => MockResponse>;
}
const makeResponse = (): MockResponse => {
  const res = {} as MockResponse;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};
describe('Direct HTTP handlers', () => {
  const suite = createTestSuite('direct-coverage');

  beforeEach(async () => {
    await suite.beforeEach();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await suite.afterEach();
  });
  it('token handler returns token info from request', async () => {
    const tokenHandler = (await import('../src/handlers/tokenHandler')).default;
    const req = {
      apiToken: {
        permissions: ['GP', 'WP'],
        token: 'test-token',
        owner: 'user-123',
        note: 'Test token',
        calls: 5,
        gameMode: 'pvp',
      },
    };
    const res = makeResponse();
    tokenHandler.getTokenInfo(req as any, res as any, vi.fn());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      permissions: ['GP', 'WP'],
      token: 'test-token',
      owner: 'user-123',
      note: 'Test token',
      calls: 5,
      gameMode: 'pvp',
    });
  });
  it('team handler createTeam returns service response', async () => {
    const { TeamService } = await import('../src/services/TeamService');
    vi.spyOn(TeamService.prototype, 'createTeam').mockResolvedValue({
      team: 'team-123',
      password: 'secret',
    });
    const teamHandler = (await import('../src/handlers/teamHandler')).default;
    const req = {
      apiToken: { owner: 'owner-1', permissions: ['TP'] },
      body: { password: 'secret' },
    };
    const res = makeResponse();
    teamHandler.createTeam(req as any, res as any, vi.fn());
    // Wait for async handler to complete
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(TeamService.prototype.createTeam).toHaveBeenCalledWith('owner-1', {
      password: 'secret',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { team: 'team-123', password: 'secret' },
    });
  });
  it('team handler joinTeam returns join status', async () => {
    const { TeamService } = await import('../src/services/TeamService');
    vi.spyOn(TeamService.prototype, 'joinTeam').mockResolvedValue({ joined: true });
    const teamHandler = (await import('../src/handlers/teamHandler')).default;
    const req = {
      apiToken: { owner: 'member-1', permissions: ['TP'] },
      body: { id: 'team-123', password: 'secret' },
    };
    const res = makeResponse();
    teamHandler.joinTeam(req as any, res as any, vi.fn());
    // Wait for async handler to complete
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(TeamService.prototype.joinTeam).toHaveBeenCalledWith('member-1', {
      id: 'team-123',
      password: 'secret',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { joined: true },
    });
  });
  it('team handler leaveTeam returns leave status', async () => {
    const { TeamService } = await import('../src/services/TeamService');
    vi.spyOn(TeamService.prototype, 'leaveTeam').mockResolvedValue({ left: true });
    const teamHandler = (await import('../src/handlers/teamHandler')).default;
    const req = {
      apiToken: { owner: 'member-1', permissions: ['TP'] },
    };
    const res = makeResponse();
    teamHandler.leaveTeam(req as any, res as any, vi.fn());
    // Wait for async handler to complete
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(TeamService.prototype.leaveTeam).toHaveBeenCalledWith('member-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { left: true },
    });
  });
  it('team handler getTeamProgress returns formatted progress', async () => {
    const { TeamService } = await import('../src/services/TeamService');
    vi.spyOn(TeamService.prototype, 'getTeamProgress').mockResolvedValue({
      data: [
        {
          tasksProgress: [],
          taskObjectivesProgress: [],
          hideoutModulesProgress: [],
          hideoutPartsProgress: [],
          displayName: 'owner-1',
          userId: 'owner-1',
          playerLevel: 42,
          gameEdition: 1,
          pmcFaction: 'USEC',
        },
      ],
      meta: { self: 'owner-1', hiddenTeammates: [] },
    });
    const teamHandler = (await import('../src/handlers/teamHandler')).default;
    const req = {
      apiToken: { owner: 'owner-1', permissions: ['TP'] },
      query: {},
    };
    const res = makeResponse();
    teamHandler.getTeamProgress(req as any, res as any, vi.fn());
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(TeamService.prototype.getTeamProgress).toHaveBeenCalledWith('owner-1', 'pvp');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          tasksProgress: [],
          taskObjectivesProgress: [],
          hideoutModulesProgress: [],
          hideoutPartsProgress: [],
          displayName: 'owner-1',
          userId: 'owner-1',
          playerLevel: 42,
          gameEdition: 1,
          pmcFaction: 'USEC',
        },
      ],
      meta: { self: 'owner-1', hiddenTeammates: [] },
    });
  });
});
