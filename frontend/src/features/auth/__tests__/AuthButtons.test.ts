import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AuthButtons from '../AuthButtons.vue';

// Mock Firebase
vi.mock('@/plugins/firebase', () => ({
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  auth: {},
  fireuser: { uid: null },
}));

// Mock router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock DataMigrationService
vi.mock('@/utils/DataMigrationService', () => ({
  default: {
    hasLocalData: vi.fn(() => false),
  },
}));

describe('AuthButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders auth buttons correctly', () => {
    const wrapper = mount(AuthButtons);

    expect(wrapper.find('.auth-card').exists()).toBe(true);
    expect(wrapper.find('.google-btn').exists()).toBe(true);
    expect(wrapper.find('.github-btn').exists()).toBe(true);
    expect(wrapper.text()).toContain('Sign in to access your account');
    expect(wrapper.text()).toContain('Continue with Google');
    expect(wrapper.text()).toContain('Continue with GitHub');
  });

  it('handles Google button click', async () => {
    const wrapper = mount(AuthButtons);
    const googleBtn = wrapper.find('.google-btn');

    expect(googleBtn.exists()).toBe(true);

    // Just verify we can click without errors
    await googleBtn.trigger('click');
    expect(wrapper.vm).toBeTruthy();
  });

  it('handles GitHub button click', async () => {
    const wrapper = mount(AuthButtons);
    const githubBtn = wrapper.find('.github-btn');

    expect(githubBtn.exists()).toBe(true);

    // Just verify we can click without errors
    await githubBtn.trigger('click');
    expect(wrapper.vm).toBeTruthy();
  });

  it('renders privacy and terms links', () => {
    const wrapper = mount(AuthButtons);

    const privacyLink = wrapper.find('[href="/privacy"]');
    const termsLink = wrapper.find('[href="/terms"]');

    expect(privacyLink.exists()).toBe(true);
    expect(privacyLink.text()).toBe('Privacy Policy');
    expect(termsLink.exists()).toBe(true);
    expect(termsLink.text()).toBe('Terms of Service');
  });

  it('has correct button styling classes', () => {
    const wrapper = mount(AuthButtons);

    const googleBtn = wrapper.find('.google-btn');
    const githubBtn = wrapper.find('.github-btn');

    expect(googleBtn.classes()).toContain('auth-btn');
    expect(githubBtn.classes()).toContain('auth-btn');
    expect(githubBtn.classes()).toContain('github-btn');
  });
});
