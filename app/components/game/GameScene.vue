<script setup lang="ts">
import type { MapAsset } from '#shared/game/types';
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';

const props = defineProps<{ engine: ReturnType<typeof useGameEngine>; floorplan: MapAsset[] }>()
const canvas = useTemplateRef<HTMLCanvasElement>('game-canvas')

onMounted(async () => {
  if (canvas.value) await props.engine.mount(canvas.value, props.floorplan)
})

onBeforeUnmount(() => props.engine.unmount())
</script>

<template>
  <canvas ref="game-canvas" class="game-canvas" aria-label="Interactive 3D dispatch floor" />
</template>

<style scoped>
.game-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
