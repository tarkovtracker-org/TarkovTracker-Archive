import { defineComponent, h } from 'vue';
import { VProgressCircular, VAlert } from 'vuetify/components';

const createFallbackComponent = (name: string, renderContent: () => ReturnType<typeof h>) =>
  defineComponent({
    name,
    setup() {
      return () => renderContent();
    },
  });

export const LoadingComponent = createFallbackComponent('ApiReferenceLoading', () =>
  h('div', { class: 'd-flex justify-center align-center pa-8' }, [
    h(VProgressCircular, { indeterminate: true, color: 'primary' }),
  ])
);

export const ErrorComponent = createFallbackComponent('ApiReferenceError', () =>
  h('div', { class: 'd-flex justify-center align-center pa-8' }, [
    h(VAlert, {
      type: 'error',
      text: 'Failed to load API documentation',
    }),
  ])
);
