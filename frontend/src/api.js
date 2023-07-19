const handleResponse = (res) => {
    if (res.status === 401) {
        window.location.href = "/api/login";
        return;
    }
    return res.json();
};
export function getWatchlist() { return fetch("/api/watchlist").then(handleResponse); }
