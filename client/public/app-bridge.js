/**
 * Chrysalis app bridge — runs FIRST in every app page, inside the shell's
 * sandboxed iframe. The frame has an opaque origin: no cookies, no storage,
 * no parent access, and its CSP says connect-src 'none'. Every interaction
 * with the engine goes through this script, which posts a request to the
 * host page; the host validates it against the app allowlist and performs it
 * with the user's session.
 *
 * Shims: fetch, WebSocket, localStorage, sessionStorage, document.cookie,
 * plus a rewriter that turns /v1 asset URLs into blob: URLs fetched over the
 * bridge (plain <img>/style loads cannot carry the session).
 */
(function () {
  "use strict";
  if (window.__chrysalisBridge) return;
  window.__chrysalisBridge = true;

  var parentWin = window.parent !== window ? window.parent : null;
  var nonce = "";
  var ready = false;
  var initQueue = [];
  var pending = {};
  var nextId = 1;
  var wsSeq = 1;

  function whenReady(fn) {
    if (ready) fn();
    else initQueue.push(fn);
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToB64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function textToB64(text) { return bytesToB64(new TextEncoder().encode(text)); }
  function b64ToText(b64) {
    try { return new TextDecoder().decode(b64ToBytes(b64)); } catch { return ""; }
  }

  function post(msg) {
    if (!parentWin) return;
    msg.__chrysalis = 1;
    msg.nonce = nonce;
    parentWin.postMessage(msg, "*");
  }
  /** websocket URLs serialize ws(s):// while location says http(s)://: same
   *  engine = same host/port and the matching ws/wss scheme. */
  function sameEngine(url) {
    var base = new URL(location.href);
    if (url.protocol !== "ws:" && url.protocol !== "wss:") return url.origin === base.origin;
    var want = base.protocol === "https:" ? "wss:" : "ws:";
    return url.protocol === want && url.host === base.host;
  }
  function call(msg) {
    return new Promise(function (resolve, reject) {
      whenReady(function () {
        var id = nextId++;
        pending[id] = { resolve: resolve, reject: reject };
        msg.__chrysalis = 1;
        msg.id = id;
        msg.nonce = nonce;
        parentWin.postMessage(msg, "*");
      });
    });
  }

  window.addEventListener("message", function (e) {
    if (!parentWin || e.source !== parentWin) return;
    var d = e.data;
    if (!d || d.__chrysalis !== 1) return;
    if (d.type === "init") {
      nonce = d.nonce;
      ready = true;
      if (d.storage && typeof d.storage === "object") reconcileStorage(d.storage);
      var q = initQueue;
      initQueue = [];
      for (var i = 0; i < q.length; i++) q[i]();
      return;
    }
    if (d.type === "fetch-result" || d.type === "fetch-error" || d.type === "shell-result" || d.type === "shell-error") {
      var p = pending[d.id];
      if (!p) return;
      delete pending[d.id];
      if (d.type === "fetch-error" || d.type === "shell-error") p.reject(new Error(d.error || "bridge request failed"));
      else p.resolve(d.type === "shell-result" ? d.data : d);
      return;
    }
    if (d.type === "ws-event") deliverWs(d);
    else if (d.type === "storage-ack") storageAck(d);
  });

  // ---------- shell ----------
  // A few shell actions for apps the engine trusts (official apps). The shell
  // honours them only while the app's tab is the one on screen, and Molfar
  // only gets a DRAFT: the user reads it and decides whether to send it.
  function shellCall(op, payload) {
    if (!parentWin) return Promise.reject(new Error("this app is not running inside Molfar Vertep"));
    var msg = { type: "shell", op: op };
    for (var k in payload) msg[k] = payload[k];
    return call(msg);
  }
  window.chrysalisShell = Object.freeze({
    /** Open Molfar on a new chat with `text` in the composer, unsent. */
    askMolfar: function (text) { return shellCall("ask-molfar", { text: String(text) }); },
    /** The user's installed apps: [{ id, name }]. */
    apps: function () { return shellCall("apps", {}); },
    /** Switch the shell to another installed app's tab. */
    openApp: function (id) { return shellCall("open-app", { appId: String(id) }); },
    /** Open the shell's Settings on the connections, on one model's settings when given "<provider>/<model>". */
    openSettings: function (model) { return shellCall("open-settings", model ? { model: String(model) } : {}); },
    /** Open the shell's Settings on one tab: "api", "models", "memory" or "backup". */
    openSettingsTab: function (tab) { return shellCall("open-settings", { tab: String(tab) }); },
    /** The shell's interface language, e.g. "uk" or "en". */
    locale: function () { return shellCall("locale", {}); },
  });

  // ---------- fetch ----------
  var TOO_BIG = 32 * 1024 * 1024;
  function bridgeFetch(input, init) {
    var req;
    try { req = new Request(input, init); } catch (e) { return Promise.reject(e); }
    var url;
    try { url = new URL(req.url, location.href); } catch { return Promise.reject(new TypeError("bad url")); }
    if (!parentWin) return Promise.reject(new TypeError("this app is not running inside Molfar Vertep"));
    if (url.origin !== new URL(location.href).origin) {
      return Promise.reject(new TypeError("blocked by the app sandbox: the bridge only reaches this engine"));
    }
    var isBodyless = req.method === "GET" || req.method === "HEAD";
    return req.arrayBuffer().then(function (buf) {
      if (buf.byteLength > TOO_BIG) throw new Error("request body too large for the bridge");
      var headers = [];
      req.headers.forEach(function (v, k) { headers.push([k, v]); });
      return call({
        type: "fetch",
        method: req.method,
        url: url.pathname + url.search,
        headers: headers,
        body: isBodyless || buf.byteLength === 0 ? null : bytesToB64(new Uint8Array(buf)),
      });
    }).then(function (res) {
      // an ArrayBuffer from this engine; a base64 string from an older shell
      var body = res.body ? (typeof res.body === "string" ? b64ToBytes(res.body) : new Uint8Array(res.body)) : null;
      var status = res.status || 200;
      var bodyless = status === 204 || status === 205 || status === 304;
      var out = bodyless || !body || body.byteLength === 0 ? null : body;
      try {
        return new Response(out, { status: status, statusText: res.statusText || "", headers: res.headers || [] });
      } catch {
        return new Response(out, { status: 200, headers: res.headers || [] });
      }
    });
  }
  try { window.fetch = bridgeFetch; } catch { /* frozen window */ }

  // ---------- WebSocket ----------
  var sockets = {};
  function BridgeWebSocket(url, protocols) {
    var self = this;
    this.url = String(url);
    this.readyState = 0;
    this.bufferedAmount = 0;
    this.extensions = "";
    this.protocol = Array.isArray(protocols) ? (protocols[0] || "") : (protocols || "");
    this.binaryType = "blob";
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this._id = wsSeq++;
    this._listeners = { open: [], message: [], error: [], close: [] };
    sockets[this._id] = this;
    var target;
    try { target = new URL(this.url, location.href); } catch { target = null; }
    if (!parentWin || !target || !sameEngine(target)) {
      setTimeout(function () { self._fail(); }, 0);
      return;
    }
    call({
      type: "ws-open",
      wsId: this._id,
      url: target.pathname + target.search,
      protocols: Array.isArray(protocols) ? protocols : protocols ? [protocols] : [],
    }).catch(function () { self._fail(); });
  }
  BridgeWebSocket.CONNECTING = 0;
  BridgeWebSocket.OPEN = 1;
  BridgeWebSocket.CLOSING = 2;
  BridgeWebSocket.CLOSED = 3;
  BridgeWebSocket.prototype.CONNECTING = 0;
  BridgeWebSocket.prototype.OPEN = 1;
  BridgeWebSocket.prototype.CLOSING = 2;
  BridgeWebSocket.prototype.CLOSED = 3;
  BridgeWebSocket.prototype.addEventListener = function (type, fn) {
    if (this._listeners[type]) this._listeners[type].push(fn);
  };
  BridgeWebSocket.prototype.removeEventListener = function (type, fn) {
    var l = this._listeners[type];
    if (!l) return;
    var i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  };
  BridgeWebSocket.prototype._emit = function (type, ev) {
    var handler = this["on" + type];
    if (typeof handler === "function") handler.call(this, ev);
    var l = this._listeners[type] || [];
    for (var i = 0; i < l.length; i++) l[i].call(this, ev);
  };
  BridgeWebSocket.prototype._fail = function () {
    this.readyState = 3;
    delete sockets[this._id];
    this._emit("error", { type: "error" });
    this._emit("close", { type: "close", code: 1006, reason: "bridge closed", wasClean: false });
  };
  BridgeWebSocket.prototype.send = function (data) {
    if (this.readyState !== 1) throw new Error("WebSocket is not open");
    var binary = typeof data !== "string";
    var payload = data;
    if (binary) {
      if (data instanceof ArrayBuffer) payload = bytesToB64(new Uint8Array(data));
      else if (data && data.buffer) payload = bytesToB64(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      else if (typeof Blob !== "undefined" && data instanceof Blob) {
        var self = this;
        data.arrayBuffer().then(function (b) { post({ type: "ws-send", wsId: self._id, data: bytesToB64(new Uint8Array(b)), binary: true }); });
        return;
      } else payload = String(data);
    }
    post({ type: "ws-send", wsId: this._id, data: payload, binary: binary });
  };
  BridgeWebSocket.prototype.close = function (code, reason) {
    if (this.readyState === 3) return;
    this.readyState = 2;
    post({ type: "ws-close", wsId: this._id, code: code || 1000, reason: reason || "" });
    delete sockets[this._id];
    var self = this;
    setTimeout(function () {
      if (self.readyState === 2) {
        self.readyState = 3;
        self._emit("close", { type: "close", code: code || 1000, reason: reason || "", wasClean: true });
      }
    }, 0);
  };
  function deliverWs(d) {
    var ws = sockets[d.wsId];
    if (!ws) return;
    if (d.event === "open") {
      ws.readyState = 1;
      ws.protocol = d.protocol || ws.protocol;
      ws._emit("open", { type: "open" });
      return;
    }
    if (d.event === "message") {
      var data = d.binary ? b64ToBytes(d.data) : d.data;
      ws._emit("message", { type: "message", data: data });
      return;
    }
    if (d.event === "close") {
      ws.readyState = 3;
      delete sockets[d.wsId];
      ws._emit("close", { type: "close", code: d.code || 1000, reason: d.reason || "", wasClean: true });
      return;
    }
    ws._fail();
  }
  try { window.WebSocket = BridgeWebSocket; } catch { /* frozen window */ }

  // Apps never need peer connections; drop the constructor here. The engine
  // also sends Connection-Allowlist (`webrtc=block`) with the frame, which
  // browsers enforce where implemented.
  try { Object.defineProperty(window, "RTCPeerConnection", { value: undefined, configurable: true }); } catch { /* frozen */ }
  try { Object.defineProperty(window, "webkitRTCPeerConnection", { value: undefined, configurable: true }); } catch { /* frozen */ }

  // ---------- storage ----------
  function snapshot() {
    var seed = { local: {}, session: {} };
    try {
      var raw = new URLSearchParams(location.hash.slice(1)).get("__storage");
      if (raw) seed = JSON.parse(b64ToText(decodeURIComponent(raw))) || seed;
    } catch { /* empty */ }
    if (!seed || typeof seed !== "object") seed = { local: {}, session: {} };
    if (!seed.local || typeof seed.local !== "object") seed.local = {};
    if (!seed.session || typeof seed.session !== "object") seed.session = {};
    if (!seed.unsaved || typeof seed.unsaved !== "object") seed.unsaved = {};
    return seed;
  }
  var seed = snapshot();
  // The snapshot in the hash is what a reload of THIS frame starts from: the
  // app's own location.reload() reloads the URL the shell built when it made
  // the frame. Left stale, a reload dropped every write since then (a draft
  // being typed, the reload-reason note). So the hash follows the writes.
  // It must be current BEFORE reload() is called: Chromium takes the URL at
  // the call, a rewrite in beforeunload is too late (checked in a browser).
  // Each write rewrites at once while under 150 rewrites in 10 s (Chromium
  // ignores replaceState past ~200 calls in 10 s; typing stays well under);
  // past that, writes wait for the window and land as one trailing rewrite.
  // The hash can still be behind (that trailing window, a refused rewrite):
  // the shell's copy settles it after the handshake, see reconcileStorage.
  var liveStores = {};
  var snapTimer = 0;
  var snapTimes = [];
  function writeSnapshot() {
    clearTimeout(snapTimer);
    snapTimer = 0;
    snapTimes.push(Date.now());
    try {
      var params = new URLSearchParams(location.hash.slice(1));
      var snap = { local: liveStores.local || {}, session: liveStores.session || {} };
      if (unsavedCount()) snap.unsaved = unsaved;
      if (resyncAt) snap.resync = resyncAt;
      params.set("__storage", textToB64(JSON.stringify(snap)));
      history.replaceState(history.state, "", location.href.split("#")[0] + "#" + params.toString());
    } catch { /* URL rewrite refused: a reload starts from the older snapshot, then reconciles */ }
  }
  function scheduleSnapshot() {
    if (snapTimer) return;
    var now = Date.now();
    while (snapTimes.length && snapTimes[0] <= now - 10000) snapTimes.shift();
    if (snapTimes.length < 150) writeSnapshot();
    else snapTimer = setTimeout(writeSnapshot, snapTimes[0] + 10000 - now);
  }

  // Write acknowledgements. Every write carries an opId; the shell answers
  // with storage-ack once its own copy is written, or with the reason it
  // refused (the app's share is full, the browser's quota is spent). A
  // refused value stays in frame memory and in the hash, listed in
  // `unsaved`, and the app hears about it: window.chrysalisStorage.unsaved()
  // and a "chrysalis:storage" event. Only the ack of a key's newest write
  // counts, so a late ack never marks newer text saved.
  var opSeq = 0;
  var lastOp = { local: {}, session: {} };
  var unsaved = { local: {}, session: {} };
  ["local", "session"].forEach(function (w) {
    var u = seed.unsaved[w];
    if (u && typeof u === "object") Object.keys(u).forEach(function (k) { unsaved[w][k] = String(u[k]); });
  });
  // keys the app wrote (or a clear it ran) since this document started: newer
  // than anything the shell sends in the handshake
  var touched = { local: {}, session: {} };
  var cleared = { local: false, session: false };
  var storageRead = false;
  var resyncAt = typeof seed.resync === "number" ? seed.resync : 0;
  var bootAt = Date.now();
  function unsavedCount() {
    return Object.keys(unsaved.local).length + Object.keys(unsaved.session).length;
  }
  function unsavedList() {
    var out = [];
    ["local", "session"].forEach(function (w) {
      Object.keys(unsaved[w]).forEach(function (k) { out.push({ storage: w, key: k, reason: unsaved[w][k] }); });
    });
    return out;
  }
  function announceUnsaved() {
    try { window.dispatchEvent(new CustomEvent("chrysalis:storage", { detail: { unsaved: unsavedList() } })); } catch { /* no events */ }
  }
  function storageAck(d) {
    var which = d.which === "session" ? "session" : "local";
    if (typeof d.opId !== "number") return;
    var before = JSON.stringify(unsaved[which]);
    if (d.op === "clear") {
      if (d.accepted) Object.keys(unsaved[which]).forEach(function (k) { if (!(lastOp[which][k] > d.opId)) delete unsaved[which][k]; });
    } else if (typeof d.key === "string" && lastOp[which][d.key] === d.opId) {
      if (d.accepted) delete unsaved[which][d.key];
      else unsaved[which][d.key] = typeof d.reason === "string" ? d.reason : "refused";
    }
    if (JSON.stringify(unsaved[which]) === before) return;
    scheduleSnapshot();
    announceUnsaved();
  }
  window.chrysalisStorage = Object.freeze({
    /** Writes the shell refused: [{ storage: "local"|"session", key, reason }].
     *  The values are still in this page's storage, not in the shell's. */
    unsaved: function () { return unsavedList(); },
  });

  // After the handshake the shell's copy says what a reload should have
  // started from. The hash may be behind it (a trailing rewrite that never
  // ran, a refused rewrite, another tab of the same app): keys the app has
  // not written since this document started take the shell's value. Keys the
  // shell refused keep the frame's value and are offered to it again. When
  // the app already read storage, the corrected snapshot needs one reload to
  // reach it; a second within 10 s is not taken (no loop), the app then gets
  // "storage" events for the keys that changed.
  function reconcileStorage(host) {
    if (reconcileStorage.done) return;
    reconcileStorage.done = true;
    var changed = [];
    var retry = [];
    ["local", "session"].forEach(function (w) {
      var hostNs = host[w] && typeof host[w] === "object" ? host[w] : {};
      var data = liveStores[w];
      if (!data || cleared[w]) return;
      var keys = {};
      Object.keys(hostNs).forEach(function (k) { keys[k] = 1; });
      Object.keys(data).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) {
        if (touched[w][k]) return;
        if (Object.prototype.hasOwnProperty.call(unsaved[w], k)) {
          if (Object.prototype.hasOwnProperty.call(data, k)) retry.push([w, k]);
          return;
        }
        var want = Object.prototype.hasOwnProperty.call(hostNs, k) ? String(hostNs[k]) : undefined;
        var have = Object.prototype.hasOwnProperty.call(data, k) ? data[k] : undefined;
        if (want === have) return;
        if (want === undefined) delete data[k];
        else data[k] = want;
        changed.push([w, k, have, want]);
      });
    });
    retry.forEach(function (r) { pushOp(r[0], "set", r[1], liveStores[r[0]][r[1]]); });
    if (!changed.length) return;
    // a handshake that came late (the shell registered the frame slowly) does
    // not reload under a user who may already be typing
    var reload = storageRead && Date.now() - bootAt < 3000 && !(resyncAt && Date.now() - resyncAt < 10000);
    if (reload) resyncAt = Date.now();
    writeSnapshot();
    if (reload) {
      try { location.reload(); return; } catch { /* fall through to events */ }
    }
    changed.forEach(function (c) {
      try {
        window.dispatchEvent(new StorageEvent("storage", { key: c[1], oldValue: c[2] === undefined ? null : c[2], newValue: c[3] === undefined ? null : c[3], url: location.href }));
      } catch { /* no StorageEvent */ }
    });
  }

  function pushOp(which, op, key, value) {
    // posted even before the handshake: a write followed immediately by a
    // reload used to sit in a queue that died with the frame, losing the
    // write (and looping any reload guard built on it). The host accepts
    // storage before the nonce for this reason.
    var opId = ++opSeq;
    if (op === "clear") {
      cleared[which] = true;
      lastOp[which] = {};
    } else {
      touched[which][key] = 1;
      lastOp[which][key] = opId;
    }
    post({ type: "storage", which: which, op: op, key: key, value: value, opId: opId });
    scheduleSnapshot();
  }
  function makeStorage(which, initial) {
    var data = {};
    Object.keys(initial || {}).forEach(function (k) { data[k] = String(initial[k]); });
    liveStores[which] = data;
    var has = function (k) { return Object.prototype.hasOwnProperty.call(data, k); };
    // An unchanged write is not sent: a store that persists on every state
    // change (stream ticks) would spend the hash rewrites on nothing. A value
    // the shell refused is sent again: it may fit now.
    function set(k, v) {
      if (has(k) && data[k] === v && !Object.prototype.hasOwnProperty.call(unsaved[which], k)) return;
      data[k] = v;
      pushOp(which, "set", k, v);
    }
    function remove(k) {
      if (!has(k) && !Object.prototype.hasOwnProperty.call(unsaved[which], k)) return;
      delete data[k];
      pushOp(which, "remove", k, null);
    }
    var methods = {
      getItem: function (k) { storageRead = true; k = String(k); return has(k) ? data[k] : null; },
      setItem: function (k, v) { set(String(k), String(v)); },
      removeItem: function (k) { remove(String(k)); },
      clear: function () { Object.keys(data).forEach(function (k) { delete data[k]; }); pushOp(which, "clear", null, null); },
      key: function (i) { storageRead = true; return Object.keys(data)[i] || null; },
    };
    return new Proxy(data, {
      get: function (t, p) {
        if (p === "length") { storageRead = true; return Object.keys(t).length; }
        if (typeof p === "string" && methods[p]) return methods[p];
        if (typeof p === "symbol") return t[p];
        storageRead = true;
        return Object.prototype.hasOwnProperty.call(t, p) ? t[p] : undefined;
      },
      set: function (_t, p, v) {
        if (typeof p !== "string" || methods[p]) return true;
        set(p, String(v));
        return true;
      },
      deleteProperty: function (_t, p) {
        remove(String(p));
        return true;
      },
      has: function (t, p) { storageRead = true; return p in t || (typeof p === "string" && !!methods[p]); },
      ownKeys: function (t) { storageRead = true; return Reflect.ownKeys(t); },
    });
  }
  try { Object.defineProperty(window, "localStorage", { value: makeStorage("local", seed.local), configurable: true }); } catch { /* frozen */ }
  try { Object.defineProperty(window, "sessionStorage", { value: makeStorage("session", seed.session), configurable: true }); } catch { /* frozen */ }
  try {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: function () { return ""; },
      set: function () { /* cookies do not exist in the sandbox */ },
    });
  } catch { /* frozen */ }

  // ---------- /v1 asset URLs -> blob: (plain subresource loads carry no session) ----------
  var blobUrls = {};
  var blobJobs = {};
  function isAssetUrl(u) {
    return typeof u === "string" && u.indexOf("/v1/") === 0;
  }
  function assetUrl(path) {
    if (blobUrls[path]) return Promise.resolve(blobUrls[path]);
    if (!blobJobs[path]) {
      blobJobs[path] = bridgeFetch(path).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      }).then(function (b) {
        var u = URL.createObjectURL(b);
        blobUrls[path] = u;
        return u;
      }).catch(function () {
        return null;
      }).then(function (v) {
        delete blobJobs[path];
        return v;
      });
    }
    return blobJobs[path];
  }
  function rewriteValue(el, attr, value) {
    var path = value;
    var m = /^([^?#]*)([?#].*)?$/.exec(value);
    if (m) path = new URL(value, location.href).pathname + (new URL(value, location.href).search || "");
    assetUrl(path).then(function (blob) {
      if (blob && el.getAttribute(attr) === value) el.setAttribute(attr, blob);
    });
  }
  function rewriteSrcset(el, value) {
    var parts = value.split(",");
    var changed = false;
    parts.forEach(function (part) {
      var bits = part.trim().split(/\s+/);
      if (bits[0] && isAssetUrl(bits[0])) {
        var src = bits[0];
        changed = true;
        assetUrl(new URL(src, location.href).pathname).then(function (blob) {
          if (blob) el.setAttribute("srcset", el.getAttribute("srcset").split(src).join(blob));
        });
      }
    });
    return changed;
  }
  function rewriteCss(text) {
    return text.replace(/url\((['"]?)(\/v1\/[^)'"]*)\1\)/g, function (all, q, path) {
      var full = path;
      assetUrl(full).then(function (blob) {
        if (!blob) return;
        document.querySelectorAll("[style*='" + path + "']").forEach(function (el) {
          el.setAttribute("style", el.getAttribute("style").split(full).join(blob));
        });
        document.querySelectorAll("style").forEach(function (tag) {
          if (tag.textContent && tag.textContent.indexOf(full) >= 0) tag.textContent = tag.textContent.split(full).join(blob);
        });
      });
      return all;
    });
  }
  function rewriteElement(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.hasAttribute("src") && isAssetUrl(el.getAttribute("src"))) rewriteValue(el, "src", el.getAttribute("src"));
    if (el.hasAttribute("poster") && isAssetUrl(el.getAttribute("poster"))) rewriteValue(el, "poster", el.getAttribute("poster"));
    if (el.hasAttribute("srcset")) rewriteSrcset(el, el.getAttribute("srcset"));
    if (el.hasAttribute("style") && el.getAttribute("style").indexOf("/v1/") >= 0) rewriteCss(el.getAttribute("style"));
    if (el.tagName === "STYLE" && el.textContent && el.textContent.indexOf("/v1/") >= 0) rewriteCss(el.textContent);
  }
  function scanTree(root) {
    if (!root || root.nodeType !== 1) return;
    rewriteElement(root);
    if (root.querySelectorAll) {
      root.querySelectorAll("img,source,video,audio,[style],[poster],style").forEach(rewriteElement);
    }
  }
  try {
    scanTree(document.documentElement);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === "attributes") rewriteElement(r.target);
        else if (r.type === "childList") {
          for (var j = 0; j < r.addedNodes.length; j++) scanTree(r.addedNodes[j]);
        }
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "style", "poster"],
    });
  } catch { /* no observer */ }

  // ---------- handshake ----------
  // the host may not have registered this frame yet when the script runs, so
  // hello repeats until init lands
  if (parentWin) {
    post({ type: "hello" });
    var helloTimer = setInterval(function () {
      if (ready) { clearInterval(helloTimer); return; }
      post({ type: "hello" });
    }, 300);
  }
})();
