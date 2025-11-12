import { createPinia } from 'pinia';
import { PiniaFireswap } from './pinia-firestore';
const pinia = createPinia();
pinia.use(PiniaFireswap);
export default pinia;
