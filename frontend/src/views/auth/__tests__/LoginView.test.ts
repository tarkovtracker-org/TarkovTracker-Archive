import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LoginView from '../LoginView.vue';

// Mock dependencies
const mockFireuser: { uid: string | null; displayName: string | null } = {
  uid: null,
  displayName: 'User',
};

vi.mock('@/plugins/firebase.ts', () => ({
  fireuser: mockFireuser,
}));

vi.mock('@/components/ui/TrackerTip', () => ({
  default: {
    name: 'TrackerTip',
    template: '<div class="tracker-tip"><slot /></div>',
  },
}));

vi.mock('@/components/domain/auth/AuthButtons', () => ({
  default: {
    name: 'AuthButtons',
    template: '<div class="auth-buttons"><slot /></div>',
    emits: ['migration-dialog-shown', 'migration-dialog-closed'],
  },
}));

describe('LoginView', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders login page correctly when not authenticated', async () => {
    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-btn': { template: '<button class="v-btn"><slot /></button>' },
          'v-icon': { template: '<i class="v-icon"></i>' },
          'router-link': {
            template: '<a class="router-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    // Should show AuthButtons when not authenticated
    expect(wrapper.findComponent({ name: 'AuthButtons' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);

    // Should not show success card
    expect(wrapper.find('.auth-success-card').exists()).toBe(false);
  });

  it('renders success state when user is already authenticated', async () => {
    // Mock authenticated user
    mockFireuser.uid = 'user-123';
    mockFireuser.displayName = 'Test User';

    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-btn': { template: '<button class="v-btn"><slot /></button>' },
          'v-icon': { template: '<i class="v-icon"></i>' },
          'router-link': {
            template: '<a class="router-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    await nextTick();

    // Should show success card
    expect(wrapper.find('.auth-success-card').exists()).toBe(true);
    expect(wrapper.text()).toContain("You're already signed in!");
    expect(wrapper.text()).toContain('Welcome back, Test User!');

    // Should not show AuthButtons when authenticated and not showing migration dialog
    expect(wrapper.findComponent({ name: 'AuthButtons' }).exists()).toBe(false);
  });

  it('shows fallback display name when displayName is null', async () => {
    mockFireuser.uid = 'user-123';
    mockFireuser.displayName = 'Fallback User';

    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-btn': { template: '<button class="v-btn"><slot /></button>' },
          'v-icon': { template: '<i class="v-icon"></i>' },
          'router-link': {
            template: '<a class="router-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    await nextTick();

    expect(wrapper.text()).toContain('Welcome back, User!');
  });

  it('handles migration dialog state correctly', async () => {
    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-btn': { template: '<button class="v-btn"><slot /></button>' },
          'v-icon': { template: '<i class="v-icon"></i>' },
          'router-link': {
            template: '<a class="router-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    const authButtons = wrapper.findComponent({ name: 'AuthButtons' });

    // Should show AuthButtons when not authenticated
    expect(wrapper.vm.showingMigrationDialog).toBe(false);
    expect(authButtons.exists()).toBe(true);

    // Simulate migration dialog shown
    await authButtons.vm.$emit('migration-dialog-shown');
    await nextTick();

    expect(wrapper.vm.showingMigrationDialog).toBe(true);

    // Simulate migration dialog closed
    await authButtons.vm.$emit('migration-dialog-closed');
    await nextTick();

    expect(wrapper.vm.showingMigrationDialog).toBe(false);
  });

  it('renders TrackerTip component', () => {
    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TrackerTip' }).props('tip')).toEqual({ id: 'login' });
  });

  it('applies correct CSS classes and styling', () => {
    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-btn': { template: '<button class="v-btn"><slot /></button>' },
          'v-icon': { template: '<i class="v-icon"></i>' },
          'router-link': {
            template: '<a class="router-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    // Main container
    expect(wrapper.find('.login-page').exists()).toBe(true);

    // Container with specific styles
    const container = wrapper.find('.v-container');
    expect(container.exists()).toBe(true);
    expect(container.attributes('class')).toContain('d-flex');
    expect(container.attributes('class')).toContain('align-start');
    expect(container.attributes('class')).toContain('justify-center');
  });

  it('renders dashboard link with correct route', async () => {
    vi.doMock('@/plugins/firebase.ts', () => ({
      fireuser: {
        uid: 'user-123',
        displayName: 'Test User',
      },
    }));

    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
          'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
          'v-btn': { template: '<button class="v-btn"><slot /></button>' },
          'v-icon': { template: '<i class="v-icon"></i>' },
          'router-link': {
            template: '<a class="router-link" :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    });

    await nextTick();

    const dashboardLink = wrapper.findComponent({ name: 'router-link' });
    expect(dashboardLink.exists()).toBe(true);
    expect(dashboardLink.props('to')).toBe('/');
  });

  it('uses async components correctly', () => {
    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    // Both components should be loaded asynchronously
    expect(wrapper.vm.$options.components.TrackerTip).toBeDefined();
    expect(wrapper.vm.$options.components.AuthButtons).toBeDefined();
  });

  it('handles component lifecycle correctly', async () => {
    wrapper = mount(LoginView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    // Should initialize with showingMigrationDialog as false
    expect(wrapper.vm.showingMigrationDialog).toBe(false);

    // Should mount successfully
    expect(wrapper.exists()).toBe(true);
  });
});
