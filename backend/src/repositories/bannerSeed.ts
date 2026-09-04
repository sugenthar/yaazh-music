import { BannerRepository } from "./bannerRepository";

/**
 * Seeds the initial banner content through the repository so components never
 * hardcode banner content. Only inserts rows that are missing (idempotent).
 */
export const seedBanners = (banners: BannerRepository): void => {
  banners.seed({
    type: "featured",
    title: "Welcome to Yaazh Music",
    subtitle: "Discover music that moves you.",
    actionType: "screen",
    actionTarget: "search",
    imageKey: "yaazh_music_banner",
    position: 0,
  });
};
