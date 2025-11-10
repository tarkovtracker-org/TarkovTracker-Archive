import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    // Standard Layout
    path: '/',
    component: () => import('@/components/layout/StandardLayout.vue'),
    children: [
      {
        // Default route
        name: 'dashboard',
        path: '/',
        alias: ['/', '/dashboard'],
        meta: { background: 'sunset' },
        component: () => import('@/views/dashboard/DashboardView.vue'),
      },
      {
        name: 'neededitems',
        path: '/items',
        meta: {},
        component: () => import('@/views/items/ItemsView.vue'),
      },
      {
        name: 'tasks',
        path: '/tasks',
        meta: {},
        component: () => import('@/views/tasks/TaskListView.vue'),
      },
      {
        name: 'hideout',
        path: '/hideout',
        meta: { background: 'hideout' },
        component: () => import('@/views/hideout/HideoutView.vue'),
      },
      {
        name: 'settings',
        path: '/settings',
        meta: { background: 'checkpoint' },
        component: () => import('@/views/settings/UserSettingsView.vue'),
      },
      {
        name: 'api',
        path: '/api',
        meta: { background: 'gas' },
        component: () => import('@/views/settings/ApiSettingsView.vue'),
      },
      {
        name: 'api-docs',
        path: '/api-docs',
        meta: { background: 'customs' },
        component: () => import('@/views/docs/ApiDocsView.vue'),
      },
      {
        name: 'privacy',
        path: '/privacy',
        meta: { background: 'sunset' },
        component: () => import('@/views/legal/PrivacyPolicyView.vue'),
      },
      {
        name: 'terms',
        path: '/terms',
        meta: { background: 'sunset' },
        component: () => import('@/views/legal/TermsOfServiceView.vue'),
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
      },
      {
        name: 'login',
        path: '/login',
        meta: { background: 'checkpoint' },
        component: () => import('@/views/auth/LoginView.vue'),
      },
      {
        name: 'team',
        path: '/team',
        meta: { background: 'busstation' },
        component: () => import('@/views/team/TeamView.vue'),
      },
    ],
  },
];

export default routes;
