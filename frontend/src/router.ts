import { createRouter, createWebHistory } from "vue-router";
import OverlayView from "@/views/OverlayView.vue";
import HeroesAdminView from "@/views/HeroesAdminView.vue";
import ChattersView from "@/views/ChattersView.vue";
import TestPlaygroundView from "@/views/TestPlaygroundView.vue";
import AuthCallback from "@/views/AuthCallback.vue";
import HomeView from "@/views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    {
      path: "/overlay",
      name: "overlay",
      component: OverlayView,
      meta: { overlay: true },
    },
    { path: "/admin", name: "admin", component: HeroesAdminView },
    { path: "/test", name: "test", component: TestPlaygroundView },
    { path: "/chatters", name: "chatters", component: ChattersView },
    { path: "/auth/callback", name: "auth-callback", component: AuthCallback },
  ],
});

export default router;
