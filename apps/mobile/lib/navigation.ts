import type { Href, ImperativeRouter } from 'expo-router';

export function goBackOrReplace(
  router: Pick<ImperativeRouter, 'canGoBack' | 'back' | 'replace'>,
  fallback: Href = '/',
) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
