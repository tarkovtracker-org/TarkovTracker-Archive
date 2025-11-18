import { mount } from '@vue/test-utils';
import type { Component } from 'vue';
import AlternativesList from '../AlternativesList.vue';
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => `i18n:${key}`,
  }),
}));
const createTaskLinkStub = (): Component => ({
  name: 'TaskLinkStub',
  props: {
    task: {
      type: Object,
      default: null,
    },
  },
  template: '<div class="task-link-stub">{{ task?.name ?? "missing-task" }}</div>',
});
const mountAlternativesList = (props: {
  alternatives: string[];
  tasks: Record<string, { id: string; name?: string }>;
  xs?: boolean;
  label?: string;
}) =>
  mount(AlternativesList, {
    props,
    global: {
      stubs: {
        TaskLink: createTaskLinkStub(),
      },
    },
  });
describe('AlternativesList', () => {
  it('renders the default label when none is provided', () => {
    const wrapper = mountAlternativesList({
      alternatives: ['1'],
      tasks: { '1': { id: '1', name: 'Task One' } },
      xs: false,
    });
    expect(wrapper.text()).toContain('i18n:page.tasks.questcard.alternatives');
  });
  it('renders the provided label when available', () => {
    const wrapper = mountAlternativesList({
      alternatives: ['1'],
      tasks: { '1': { id: '1', name: 'Task One' } },
      xs: false,
      label: 'Custom Label',
    });
    expect(wrapper.text()).toContain('Custom Label');
  });
  it('matches task IDs regardless of string or number input', () => {
    const wrapper = mountAlternativesList({
      alternatives: ['42'],
      tasks: { '42': { id: '42', name: 'The Answer' } },
      xs: false,
    });
    const renderedTaskNames = wrapper.findAll('.task-link-stub').map((node) => node.text());
    expect(renderedTaskNames).toContain('The Answer');
  });
  it('keeps placeholder entries when a matching task is missing', () => {
    const wrapper = mountAlternativesList({
      alternatives: ['1', 'missing'],
      tasks: { '1': { id: '1', name: 'Task One' } },
      xs: false,
    });
    const renderedTaskNames = wrapper.findAll('.task-link-stub').map((node) => node.text());
    expect(renderedTaskNames).toEqual(['Task One', 'missing-task']);
  });
});
