import axios from 'axios';

class HttpService{
    constructor(baseURL = 'http://localhost:5294/'){
        this.baseURL = baseURL;
        this.instance = axios.create ({baseURL : this.baseURL});
    }

    async request(method, url, data = null, customHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...customHeaders };
        const source = axios.CancelToken.source();

        const config = {
            method,
            url,
            headers,
            cancelToken: source.token
        };

        if (data) {
            config.data = data;
        }

        return {
            request: this.instance(config),
            cancel: source.cancel
        };
    }

    post(url,data){
        return this.request('post',url,data);
    }
}