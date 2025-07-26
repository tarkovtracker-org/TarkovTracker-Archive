import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export function useItemRowIntersection(elementRef: Ref<HTMLElement | null>) {
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    const element = elementRef.value;
    if (element) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            isVisible.value = true;
            observer?.disconnect();
          }
        },
        {
          rootMargin: '50px',
          threshold: 0.1,
        }
      );
      observer.observe(element);
    }
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return {
    isVisible,
  };
}
