const handleResponse = (res) => {
    if (res.status === 401) {
        window.location.href = "/api/login";
        return;
    }
    if (!res.ok) {
        throw new Error(`[${res.status}]: ${res.message}`)
      }
    return res.json();
};
export function getWatchlist(list) { 
    console.log(list);
    return fetch(`/api/watchlist/${list}/`).then(handleResponse); 
}
export function getLists() { return fetch("/api/lists").then(handleResponse); }
export function refresh(list) { return fetch(`/api/refresh/${list}/`).then(handleResponse); }


