import { useLocalStorage } from './useLocalStorage';

const listStorageKey = "watchlist.trakt_list";
export const useList = function useList() {
    const [list, setList] = useLocalStorage(listStorageKey, "");
    return [list, setList];
}
