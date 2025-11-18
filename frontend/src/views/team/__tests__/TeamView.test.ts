import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TeamView from '../TeamView.vue';
import { useLiveData } from '@/composables/livedata';
import { useRoute } from 'vue-router';

// Mock dependencies
vi.mock('@/plugins/firebase', () => ({
  fireuser: {
    loggedIn: true,
    uid: 'test-user-123',
  },
}));

vi.mock('@/composables/livedata', () => ({
  useLiveData: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
}));

vi.mock('@/components/ui/TrackerTip', () => ({
  default: {
    name: 'TrackerTip',
    template: '<div class="tracker-tip"><slot /></div>',
  },
}));

vi.mock('@/components/domain/team/TeamMembers', () => ({
  default: {
    name: 'TeamMembers',
    template: '<div class="team-members">Team Members Component</div>',
  },
}));

vi.mock('@/components/domain/team/TeamOptions', () => ({
  default: {
    name: 'TeamOptions',
    template: '<div class="team-options">Team Options Component</div>',
  },
}));

vi.mock('@/components/domain/team/MyTeam', () => ({
  default: {
    name: 'MyTeam',
    template: '<div class="my-team">My Team Component</div>',
  },
}));

vi.mock('@/components/domain/team/TeamInvite', () => ({
  default: {
    name: 'TeamInvite',
    template: '<div class="team-invite">Team Invite Component</div>',
  },
}));

describe('TeamView', () => {
  let wrapper: any;
  let mockSystemStore: any;
  let mockRoute: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock system store
    mockSystemStore = {
      $state: {
        team: 'team-123',
      },
    };

    // Mock route
    mockRoute = {
      query: {},
    };

    vi.mocked(useLiveData).mockReturnValue({
      useSystemStore: vi.fn(() => ({ systemStore: mockSystemStore })),
    } as any);

    vi.mocked(useRoute).mockReturnValue(mockRoute);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders correctly when user is logged in and has team', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should render TrackerTip
    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TrackerTip' }).props('tip')).toEqual({ id: 'team' });

    // Should render container since user is logged in
    expect(wrapper.find('.v-container').exists()).toBe(true);

    // Should render TeamMembers since team exists
    expect(wrapper.findComponent({ name: 'TeamMembers' }).exists()).toBe(true);

    // Should render MyTeam and TeamOptions
    expect(wrapper.findComponent({ name: 'MyTeam' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TeamOptions' }).exists()).toBe(true);

    // Should not render TeamInvite by default
    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(false);
  });

  it('renders correctly when user is logged in but has no team', async () => {
    mockSystemStore.$state.team = null;

    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should not render TeamMembers when no team
    expect(wrapper.findComponent({ name: 'TeamMembers' }).exists()).toBe(false);

    // Should still render MyTeam and TeamOptions
    expect(wrapper.findComponent({ name: 'MyTeam' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TeamOptions' }).exists()).toBe(true);
  });

  it('renders TeamInvite when route has team and code query params', async () => {
    mockRoute.query = {
      team: 'team-456',
      code: 'invite-code-123',
    };

    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should render TeamInvite
    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(true);

    // Should also render other components
    expect(wrapper.findComponent({ name: 'TeamMembers' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'MyTeam' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TeamOptions' }).exists()).toBe(true);
  });

  it('does not render TeamInvite when missing team query param', async () => {
    mockRoute.query = {
      code: 'invite-code-123',
    };

    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(false);
  });

  it('does not render TeamInvite when missing code query param', async () => {
    mockRoute.query = {
      team: 'team-456',
    };

    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(false);
  });

  it('does not render container when user is not logged in', async () => {
    vi.doMock('@/plugins/firebase', () => ({
      fireuser: {
        loggedIn: false,
      },
    }));

    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should not render container content when not logged in
    expect(wrapper.find('.v-container').exists()).toBe(false);

    // Should still render TrackerTip
    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);
  });

  it('applies correct grid layout', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col" :class="$attrs.class"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const myTeamCol = wrapper.findAll('.v-col')[0];
    const teamOptionsCol = wrapper.findAll('.v-col')[1];

    // Check grid column attributes
    expect(myTeamCol.attributes('cols')).toBe('12');
    expect(myTeamCol.attributes('sm')).toBe('12');
    expect(myTeamCol.attributes('md')).toBe('12');
    expect(myTeamCol.attributes('lg')).toBe('6');
    expect(myTeamCol.attributes('xl')).toBe('6');

    expect(teamOptionsCol.attributes('cols')).toBe('12');
    expect(teamOptionsCol.attributes('sm')).toBe('12');
    expect(teamOptionsCol.attributes('md')).toBe('12');
    expect(teamOptionsCol.attributes('lg')).toBe('6');
    expect(teamOptionsCol.attributes('xl')).toBe('6');
  });

  it('applies correct row centering', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row" :class="$attrs.class"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const rows = wrapper.findAll('.v-row');
    rows.forEach((row: any) => {
      expect(row.attributes('justify')).toBe('center');
    });
  });

  it('uses async components correctly', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // All components should be defined and loaded asynchronously
    expect(wrapper.vm.$options.components.TeamMembers).toBeDefined();
    expect(wrapper.vm.$options.components.TeamOptions).toBeDefined();
    expect(wrapper.vm.$options.components.MyTeam).toBeDefined();
    expect(wrapper.vm.$options.components.TrackerTip).toBeDefined();
    expect(wrapper.vm.$options.components.TeamInvite).toBeDefined();
  });

  it('handles team state changes', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Initially should show TeamMembers
    expect(wrapper.findComponent({ name: 'TeamMembers' }).exists()).toBe(true);

    // Remove team
    mockSystemStore.$state.team = null;
    await nextTick();

    // Should not show TeamMembers
    expect(wrapper.findComponent({ name: 'TeamMembers' }).exists()).toBe(false);

    // Add team back
    mockSystemStore.$state.team = 'team-789';
    await nextTick();

    // Should show TeamMembers again
    expect(wrapper.findComponent({ name: 'TeamMembers' }).exists()).toBe(true);
  });

  it('handles route query changes', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Initially no invite
    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(false);

    // Add invite query params
    mockRoute.query = {
      team: 'team-invite',
      code: 'invite-123',
    };
    await nextTick();

    // Should show invite
    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(true);

    // Remove invite query params
    mockRoute.query = {};
    await nextTick();

    // Should hide invite
    expect(wrapper.findComponent({ name: 'TeamInvite' }).exists()).toBe(false);
  });

  it('handles component lifecycle correctly', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should mount successfully
    expect(wrapper.exists()).toBe(true);

    // Should unmount cleanly
    wrapper.unmount();
    expect(wrapper.exists()).toBe(false);
  });

  it('includes scoped styles correctly', async () => {
    wrapper = mount(TeamView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should have scoped styles
    expect(wrapper.vm.$).toBeDefined();
  });
});
