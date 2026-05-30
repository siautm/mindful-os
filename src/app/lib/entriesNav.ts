export const ARCHIVE_ENTER_KEY = "mindos-archive-enter";

export function consumeArchiveEnterFlag(): boolean {
  try {
    if (sessionStorage.getItem(ARCHIVE_ENTER_KEY) !== "1") return false;
    sessionStorage.removeItem(ARCHIVE_ENTER_KEY);
    return true;
  } catch {
    return false;
  }
}
