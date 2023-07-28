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
    return fetch(`/api/watchlist/${list}/`, {
        withCredentials: true,
    }).then(handleResponse); 
}
export function getLists() { return fetch("/api/lists").then(handleResponse); }
export function refresh(list) { 
    return fetch(`/api/refresh/${list}/`, {
        withCredentials: true,
    }).then(handleResponse); 
}
export function play(serviceType, id) {
    return fetch(`/api/play/${serviceType}/${id}`, {
        method: "POST",
        withCredentials: true,
    }).then(handleResponse);
}


