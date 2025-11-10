# Utils helpers
Stateless helpers and facades live here: migration helpers, validators, external API wrappers, and any module that can run without Pinia/firestore state.
Keeping them lightweight follows the Vue guidance on extracting reusable logic into dedicated composables (https://vuejs.org/guide/reusability/composables.html#extracting-reusable-logic) and the Clean Architecture principle that helpers should not depend on framework state (https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html).
