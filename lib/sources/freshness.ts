import type { RawArticle } from './types';

/** Avoid relabeling abandoned RSS feeds as today's news. Trending sources may lack dates. */
export function isRecentArticle(article: RawArticle, now = Date.now(), maxAgeDays = 7): boolean {
  if (!article.publishedAt) return true;
  const time = article.publishedAt.getTime();
  return Number.isFinite(time) && time >= now - maxAgeDays * 86_400_000 && time <= now + 86_400_000;
}
