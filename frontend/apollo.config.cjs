/* eslint-env node */
module.exports = {
  client: {
    service: {
      name: 'tarkov-dev-api',
      url: 'https://api.tarkov.dev/graphql',
    },
    includes: ['src/**/*.vue', 'src/**/*.js', 'src/**/*.ts', 'src/**/*.gql', 'src/**/*.graphql'],
  },
};
