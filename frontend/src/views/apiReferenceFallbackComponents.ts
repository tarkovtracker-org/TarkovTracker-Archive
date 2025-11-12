/* eslint-disable vue/one-component-per-file */
import { defineComponent, h } from 'vue';
import { useI18n } from 'vue-i18n';
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
export const ErrorComponent = defineComponent({
  name: 'ApiReferenceError',
  setup() {
    const { t } = useI18n({ useScope: 'global' });
    return () =>
      h('div', { class: 'd-flex justify-center align-center pa-8' }, [
        h(VAlert, {
          type: 'error',
          text: t('apiReference.error.loadFailed', 'Failed to load API documentation'),
        }),
      ]);
  },
});
