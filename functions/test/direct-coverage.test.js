import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const makeResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe('Direct HTTP handlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('token handler returns token info from request', async () => {
    const tokenHandler = (await import('../lib/handlers/tokenHandler.js')).default;
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

    await tokenHandler.getTokenInfo(req, res);

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
    const { TeamService } = await import('../lib/services/TeamService.js');
    vi.spyOn(TeamService.prototype, 'createTeam').mockResolvedValue({
      team: 'team-123',
      password: 'secret',
    });

    const teamHandler = (await import('../lib/handlers/teamHandler.js')).default;
    const req = {
      apiToken: { owner: 'owner-1', permissions: ['TP'] },
      body: { password: 'secret' },
    };
    const res = makeResponse();

    await teamHandler.createTeam(req, res);

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
    const { TeamService } = await import('../lib/services/TeamService.js');
    vi.spyOn(TeamService.prototype, 'joinTeam').mockResolvedValue({ joined: true });

    const teamHandler = (await import('../lib/handlers/teamHandler.js')).default;
    const req = {
      apiToken: { owner: 'member-1', permissions: ['TP'] },
      body: { id: 'team-123', password: 'secret' },
    };
    const res = makeResponse();

    await teamHandler.joinTeam(req, res);

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
    const { TeamService } = await import('../lib/services/TeamService.js');
    vi.spyOn(TeamService.prototype, 'leaveTeam').mockResolvedValue({ left: true });

    const teamHandler = (await import('../lib/handlers/teamHandler.js')).default;
    const req = {
      apiToken: { owner: 'member-1', permissions: ['TP'] },
    };
    const res = makeResponse();

    await teamHandler.leaveTeam(req, res);

    expect(TeamService.prototype.leaveTeam).toHaveBeenCalledWith('member-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { left: true },
    });
  });

  it('team handler getTeamProgress returns formatted progress', async () => {
    const { TeamService } = await import('../lib/services/TeamService.js');
    vi.spyOn(TeamService.prototype, 'getTeamProgress').mockResolvedValue({
      data: [{ member: 'owner-1' }],
      meta: { hiddenTeammates: [] },
    });

    const teamHandler = (await import('../lib/handlers/teamHandler.js')).default;
    const req = {
      apiToken: { owner: 'owner-1', permissions: ['TP'] },
      query: {},
    };
    const res = makeResponse();

    await teamHandler.getTeamProgress(req, res);

    expect(TeamService.prototype.getTeamProgress).toHaveBeenCalledWith('owner-1', 'pvp');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ member: 'owner-1' }],
      meta: { hiddenTeammates: [] },
    });
  });
});
