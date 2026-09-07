<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

const props = defineProps<{ engine: ReturnType<typeof useGameEngine> }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

onMounted(() => {
  if (canvas.value) props.engine.mount(canvas.value)
})

onBeforeUnmount(() => props.engine.unmount())
</script>

<template>
  <canvas ref="canvas" class="game-canvas" aria-label="Interactive 3D dispatch floor" />
</template>

<style scoped>
.game-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
