<script setup lang="ts">
import type { Chatter } from "@/types/chatter";

defineProps<{
  chatter: Chatter;
}>();
</script>

<template>
  <tr>
    <td>{{ chatter.displayName || chatter.username }}</td>
    <td>{{ chatter.username }}</td>
    <td>{{ chatter.hero?.name || "—" }}</td>
    <td>{{ chatter.lastSeen || "—" }}</td>
  </tr>
</template>
