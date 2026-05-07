import axios from 'axios';

class HttpService {
    constructor(baseURL = 'http://localhost:5294/') {
        this.baseURL = baseURL;
        this.instance = axios.create({ baseURL: this.baseURL });
        this.defaultHeaders = { 'Content-Type': 'application/json' };
    }

g
     request(method, url, data = null, customHeaders = {}, responseType = 'json') {
        const headers = { ...this.defaultHeaders, ...customHeaders };
        const source = axios.CancelToken.source();

        const config = {
            method,
            url,
            headers,
            responseType, //response type cuz its not always the same
            cancelToken: source.token,
        };

        if (data) {
            config.data = data;
        }

        return {
            request: this.instance(config),
            cancel: source.cancel
        };
    }

    // 2. Update post to accept the 3rd argument
    post(url, data, responseType = 'json') {
        return this.request('post', url, data, {}, responseType);
    }
}

export default HttpService;