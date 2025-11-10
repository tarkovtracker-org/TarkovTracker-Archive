<template>
  <v-list nav bg-color="transparent" class="mx-auto">
    <template v-if="fireuser.loggedIn">
      <v-list-group value="user-account-menu">
        <template #activator="{ props: activatorProps }">
          <template v-if="isCollapsed">
            <v-avatar v-bind="activatorProps" class="mx-auto" size="32" :class="'d-flex fake-link'">
              <v-img :src="avatarSrc" />
            </v-avatar>
          </template>
          <template v-else>
            <v-list-item
              v-bind="activatorProps"
              :title="userDisplayName"
              :prepend-avatar="avatarSrc"
            ></v-list-item>
          </template>
        </template>
        <drawer-item
          icon="mdi-lock"
          locale-key="logout"
          :is-collapsed="isCollapsed"
          @click.stop="logout"
        />
      </v-list-group>
    </template>
    <template v-else>
      <drawer-item
        icon="mdi-fingerprint"
        locale-key="login"
        to="/login"
        :is-collapsed="isCollapsed"
      />
    </template>
  </v-list>
</template>
<script setup lang="ts">
  import { fireuser, auth } from '@/plugins/firebase';
  import { computed } from 'vue';
  import { useUserStore } from '@/stores/user';
  import { signOut } from '@/plugins/firebase';
  import DrawerItem from '@/features/drawer/DrawerItem.vue';

  defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  const userStore = useUserStore();
  const avatarSrc = computed(() => {
    return userStore.getStreamerMode || !fireuser.photoURL
      ? '/img/default-avatar.svg'
      : fireuser.photoURL;
  });

  const userDisplayName = computed(() => {
    return userStore.getStreamerMode ? 'User' : fireuser.displayName || 'User';
  });

  function logout() {
    signOut(auth);
  }
</script>
<style lang="scss" scoped>
  :global(
    body > div.v-overlay-container > div.allow-overflow > div.v-overlay__content > div.v-sheet
  ) {
    overflow-y: visible;
  }
  .fake-link {
    cursor: pointer;
  }
</style>
