import { ref, onMounted, onUnmounted } from 'vue';
export function useTarkovTime() {
  const tarkovTime = ref('');
  let intervalId: number | null = null;
  const updateTime = () => {
    const oneHour = 60 * 60 * 1000;
    const currentDate = new Date();
    // Tarkov's time runs at 7 times the speed
    const timeAtTarkovSpeed = (currentDate.getTime() * 7) % (24 * oneHour);
    // Offset by 3 hours from UTC (Moscow time zone)
    const tarkovTimeObj = new Date(timeAtTarkovSpeed + 3 * oneHour);
    const tarkovHour = tarkovTimeObj.getUTCHours();
    const tarkovMinute = tarkovTimeObj.getUTCMinutes();
    const tarkovSecondHour = (tarkovHour + 12) % 24;
    tarkovTime.value = `${tarkovHour.toString().padStart(2, '0')}:${tarkovMinute
      .toString()
      .padStart(2, '0')} / ${tarkovSecondHour.toString().padStart(2, '0')}:${tarkovMinute
      .toString()
      .padStart(2, '0')}`;
  };
  onMounted(() => {
    updateTime();
    intervalId = window.setInterval(updateTime, 3000);
  });
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
  return {
    tarkovTime,
  };
}
