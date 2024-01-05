class Api {
  constructor(messageContext) {
    this.messageContext = messageContext;
  }

  async handleResponse(res) {
    if (res.status === 401) {
      window.location.href = '/api/login';
      return null;
    }
    if (res.status === 204) {
      return null;
    }
    let json = await Api.parseJson(res);
    if (!res.ok) {
      if (json == null) {
        json = {
          message: 'unknown error',
          status: res.status,
        };
      }
      this.messageContext.sendMessage({
        message: json.message,
        status: res.status,
        severity: 'error',
        open: true,
      });
      throw new Error(`[${res.status}]: ${json.message}`);
    } else if (json != null && json.message) {
      this.messageContext.sendMessage({
        message: json.message,
        status: res.status,
        severity: 'success',
        open: true,
      });
    }
    return json;
  }

  static async parseJson(res) {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async getWatchlist(list, sort) {
    if (!list) {
      return [];
    }
    const res = await fetch(`/api/watchlist/${list.user.username}/${list.ids.trakt}/?sort=${sort}`, {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async getLists() {
    const res = await fetch('/api/lists', {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async refresh(list) {
    if (!list) {
      return [];
    }
    const res = await fetch(`/api/refresh/${list.user.username}/${list.ids.trakt}/`, {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async reconnect() {
    const res = await fetch('/api/reconnect/', {
      method: 'POST',
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async play(serviceType, id) {
    const res = await fetch(`/api/play/${serviceType}/${id}`, {
      method: 'POST',
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async getSettings() {
    const res = await fetch('/api/settings', {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async saveSettings(settings) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return this.handleResponse(res);
  }

  async getWatchable(id) {
    const res = await fetch(`/api/watchables/${id}/`, {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async getWatchableUrls(id, providerId) {
    const res = await fetch(`/api/watchables/${id}/urls/${providerId}`, {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async saveWatchable(id, watchable) {
    const res = await fetch(`/api/watchables/${id}/`, {
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(watchable),
    });
    return this.handleResponse(res);
  }

  async deleteWatchable(id) {
    const res = await fetch(`/api/watchables/${id}/`, {
      method: 'DELETE',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(res);
  }

  async updateImage(id, imageUrl) {
    const res = await fetch(`/api/img/${id}/`, {
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });
    return this.handleResponse(res);
  }

  async createWatchable(watchable) {
    const res = await fetch('/api/watchables/', {
      method: 'PUT',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(watchable),
    });
    return this.handleResponse(res);
  }

  async pushButton(serviceType, button) {
    const res = await fetch(`/api/remote/${serviceType}/${button}/`, {
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        button,
      }),
    });
    return this.handleResponse(res);
  }

  async getProviders() {
    const res = await fetch('/api/providers', {
      withCredentials: true,
    });
    return this.handleResponse(res);
  }

  async createProvider(provider) {
    const res = await fetch('/api/providers', {
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(provider),
    });
    return this.handleResponse(res);
  }

  async updateProvider(id, provider) {
    const res = await fetch(`/api/providers/${id}/`, {
      method: 'PUT',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(provider),
    });
    return this.handleResponse(res);
  }

  async deleteProvider(id) {
    const res = await fetch(`/api/providers/${id}/`, {
      method: 'DELETE',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return this.handleResponse(res);
  }
}
export default Api;
