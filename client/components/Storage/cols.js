import {NAMESPACE, FRAME_URL} from './cols.data';

export class Cols {

  constructor (location, origin) {
    this.location = location;
    this.origin = origin.replace(/\/$/, '');
    this.iframe = document.createElement('iframe');
    this.callbacks = {};
    this.queue = [];
    this.isLoaded = false;
    this.nonce = 0;
    this.responseListener = this.responseListener.bind(this);

    this.initFrame();
    window.addEventListener('message', this.responseListener);
  }

  responseListener (ev) {
    const {origin, data} = ev;
    // Ignore messages from unknown origin
    if (origin !== this.origin) {
      return;
    }

    if (!data || data.namespace !== NAMESPACE || data.type !== 'response' || !data.id) {
      // Ignore messages without valid fields
      return;
    }

    const id = data.id;
    const response = data.data;
    const cb = this.callbacks[id];
    delete this.callbacks[id];
    if (!cb) {
      // No callback awaiting this response
      return;
    }

    // Run after deletion in case of exception
    cb(response);
  }

  initFrame () {
    this.iframe.addEventListener('load', () => {
      this.isLoaded = true;
      this.processQueue();
    });
    this.iframe.src = `${this.location}${FRAME_URL}`;
  }

  processQueue () {
    let elem = this.queue.shift();
    while (elem) {
      this.sendRequest(elem.data, elem.callback);
      elem = this.queue.shift();
    }
  }

  sendRequest (data, callback) {
    if (!this.isLoaded) {
      this.queue.push({data, callback});
      return;
    }
    this.nonce++;
    const id = this.nonce;

    this.callbacks[id] = callback;

    // send message to iframe
    this.iframe.contentWindow.postMessage({
      namespace: NAMESPACE,
      type: 'request',
      id, data
    }, this.origin);
  }

  addToDom () {
    document.querySelector('head').appendChild(this.iframe);
    return this;
  }

  destroy () {
    this.iframe.parentNode.removeChild(this.iframe);
    window.removeEventListener('message', this.responseListener);
  }

  // LocalStorage API

  setItem (key, value, cb) {
    this.sendRequest({
      action: 'set',
      key, value
    }, cb);
  }

  getItem (key, cb) {
    this.sendRequest({
      action: 'get',
      key
    }, cb);
  }
}