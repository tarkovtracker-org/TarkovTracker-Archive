<template>
  <v-btn v-show="refreshEnabled" variant="tonal" :disabled="disabled" @click="refresh()">{{
    t('common.refreshbutton')
  }}</v-btn>
</template>
<script setup>
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { useRouter } from 'vue-router';

  const props = defineProps({
    disabled: {
      type: Boolean,
      default: false,
    },
  });

  const { t } = useI18n({ useScope: 'global' });
  const { loading, hideoutLoading } = useTarkovData();
  const router = useRouter();
  const refreshEnabled = ref(false);
  // Wait 10 seconds, then enable the button if we're still loading
  setTimeout(() => {
    if (loading.value || hideoutLoading.value) {
      refreshEnabled.value = true;
    }
  }, 10000);
  const refresh = () => {
    if (props.disabled) return;
    router.go(0);
  };
</script>
<style lang="scss" scoped></style>
