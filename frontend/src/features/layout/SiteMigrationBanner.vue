<template>
  <div ref="bannerRef" class="migration-banner">
    <div class="banner-content">
      <div class="banner-icon">
        <v-icon color="white" size="24">mdi-alert-circle</v-icon>
      </div>
      <div class="banner-text">
        <span class="banner-urgent">IMPORTANT:</span>
        This version of TarkovTracker will be <strong>discontinued on January 1, 2026</strong>.
        We're launching a new version at <strong>dev.tarkovtracker.org</strong> which will replace this site.
        <span class="banner-warning">Your progress will not transfer to the new version.</span>
      </div>
      <div class="banner-actions">
        <a
          href="https://dev.tarkovtracker.org"
          target="_blank"
          class="banner-btn banner-btn-primary"
        >
          <v-icon size="16" class="mr-1">mdi-open-in-new</v-icon>
          Go to New Site
        </a>
        <a
          href="https://discord.gg/M8nBgA2sT6"
          target="_blank"
          class="banner-btn banner-btn-secondary"
        >
          <v-icon size="16" class="mr-1">mdi-forum</v-icon>
          Join Discord
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const bannerRef = ref(null);

const updateBannerHeight = () => {
  nextTick(() => {
    if (bannerRef.value) {
      const height = bannerRef.value.offsetHeight;
      document.documentElement.style.setProperty('--migration-banner-height', `${height}px`);
      document.documentElement.classList.add('has-migration-banner');
    }
  });
};

onMounted(() => {
  updateBannerHeight();
  window.addEventListener('resize', updateBannerHeight);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateBannerHeight);
  document.documentElement.style.setProperty('--migration-banner-height', '0px');
  document.documentElement.classList.remove('has-migration-banner');
});
</script>

<style lang="scss" scoped>
.migration-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 25%, #e65100 75%, #ff6d00 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 10000;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  max-width: 1600px;
  margin: 0 auto;
}

.banner-icon {
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.banner-text {
  color: white;
  font-size: 14px;
  line-height: 1.4;
  text-align: center;

  strong {
    color: #ffeb3b;
  }
}

.banner-urgent {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 4px;
}

.banner-warning {
  display: inline;
  color: #ffcdd2;
  font-weight: 500;
}

.banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.banner-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.banner-btn-primary {
  background: white;
  color: #b71c1c;

  &:hover {
    background: #ffeb3b;
    color: #b71c1c;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.banner-btn-secondary {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }
}

@media (max-width: 900px) {
  .banner-content {
    padding: 12px;
    gap: 8px;
  }

  .banner-text {
    font-size: 13px;
  }

  .banner-actions {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .banner-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 12px;
  }

  .banner-icon {
    display: none;
  }

  .banner-text {
    font-size: 12px;
  }

  .banner-btn {
    font-size: 12px;
    padding: 5px 10px;
  }
}
</style>
