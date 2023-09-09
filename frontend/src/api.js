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
export function getWatchlist(list, sort) { 
    if (!list) {
        return Promise.resolve([]);
    }
    return fetch(`/api/watchlist/${list.user.username}/${list.ids.trakt}/?sort=${sort}`, {
        withCredentials: true,
    }).then(handleResponse); 
}
export function getLists() { return fetch("/api/lists").then(handleResponse); }
export function refresh(list) { 
    if (!list) {
        return Promise.resolve([]);
    }
    return fetch(`/api/refresh/${list.user.username}/${list.ids.trakt}/`, {
        withCredentials: true,
    }).then(handleResponse); 
}
export function play(serviceType, id) {
    return fetch(`/api/play/${serviceType}/${id}`, {
        method: "POST",
        withCredentials: true,
    }).then(handleResponse);
}

export function getSettings() {
    return fetch(`/api/settings`, {
        withCredentials: true,
    }).then(handleResponse);
}

export function saveSettings(settings) {
    return fetch(`/api/settings`, {
        method: "POST",
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    }).then(handleResponse);
}

export function getWatchable(id) {
    return fetch(`/api/watchables/${id}/`, {
        withCredentials: true,
    }).then(handleResponse);    
}

export function getWatchableUrls(id, providerId) {
    return fetch(`/api/watchables/${id}/urls/${providerId}`, {
        withCredentials: true,
    }).then(handleResponse);    
}

export function saveWatchable(id, watchable) {
    return fetch(`/api/watchables/${id}/`, {
        method: "POST",
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(watchable),
    }).then(handleResponse);
}

export function pushButton(serviceType, button) {
    return fetch(`/api/remote/${serviceType}/${button}/`, {
        method: "POST",
        withCredentials: true,
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            button,
        }),
    }).then(handleResponse);
}
