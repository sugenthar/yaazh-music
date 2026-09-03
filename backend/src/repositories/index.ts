import { createRepositoryContext } from "./context";
import { createLikeRepository } from "./likeRepository";
import { createPlaylistRepository } from "./playlistRepository";
import { createHistoryRepository } from "./historyRepository";
import { createMoodRepository } from "./moodRepository";
import { userRepository } from "./userRepository";
import { toPublicUser } from "./userRepository";
import { LIKE_REPO_ERROR_CODES } from "./likeRepository";

const ctx = createRepositoryContext();

export const likes = createLikeRepository(ctx);
export const playlists = createPlaylistRepository(ctx);
export const history = createHistoryRepository(ctx);
export const moods = createMoodRepository(ctx);
export { userRepository, toPublicUser, LIKE_REPO_ERROR_CODES };
export type { AuthRepositoryContext } from "./types";
