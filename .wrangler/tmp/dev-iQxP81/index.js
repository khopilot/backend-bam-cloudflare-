var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-CPF2Jk/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-CPF2Jk/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [label, match[1], new RegExp("^" + match[2] + "$")];
      } else {
        patternCache[label] = [label, match[1], true];
      }
    }
    return patternCache[label];
  }
  return null;
}, "getPattern");
var getPath = /* @__PURE__ */ __name((request) => {
  const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
  return match ? match[1] : "";
}, "getPath");
var getQueryStrings = /* @__PURE__ */ __name((url) => {
  const queryIndex = url.indexOf("?", 8);
  return queryIndex === -1 ? "" : "?" + url.slice(queryIndex + 1);
}, "getQueryStrings");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result[result.length - 1] === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((...paths) => {
  let p = "";
  let endsWithSlash = false;
  for (let path of paths) {
    if (p[p.length - 1] === "/") {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }
    if (path[0] !== "/") {
      path = `/${path}`;
    }
    if (path === "/" && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== "/") {
      p = `${p}${path}`;
    }
    if (path === "/" && p === "") {
      p = "/";
    }
  }
  return p;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (!path.match(/\:.+\?$/)) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return /%/.test(value) ? decodeURIComponent_(value) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ?? (encoded = /[%+]/.test(url));
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ?? (results[name] = value);
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = /* @__PURE__ */ __name((cookie, name) => {
  const pairs = cookie.trim().split(";");
  return pairs.reduce((parsedCookie, pairStr) => {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      return parsedCookie;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      return parsedCookie;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = decodeURIComponent_(cookieValue);
    }
    return parsedCookie;
  }, {});
}, "parse");
var _serialize = /* @__PURE__ */ __name((name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
  }
  if (opt.domain) {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite}`;
  }
  if (opt.partitioned) {
    cookie += "; Partitioned";
  }
  return cookie;
}, "_serialize");
var serialize = /* @__PURE__ */ __name((name, value, opt = {}) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
}, "serialize");

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/utils/stream.js
var StreamingApi = /* @__PURE__ */ __name(class {
  constructor(writable, _readable) {
    this.abortSubscribers = [];
    this.writable = writable;
    this.writer = writable.getWriter();
    this.encoder = new TextEncoder();
    const reader = _readable.getReader();
    this.responseReadable = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        done ? controller.close() : controller.enqueue(value);
      },
      cancel: () => {
        this.abortSubscribers.forEach((subscriber) => subscriber());
      }
    });
  }
  async write(input) {
    try {
      if (typeof input === "string") {
        input = this.encoder.encode(input);
      }
      await this.writer.write(input);
    } catch (e) {
    }
    return this;
  }
  async writeln(input) {
    await this.write(input + "\n");
    return this;
  }
  sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  async close() {
    try {
      await this.writer.close();
    } catch (e) {
    }
  }
  async pipe(body) {
    this.writer.releaseLock();
    await body.pipeTo(this.writable, { preventClose: true });
    this.writer = this.writable.getWriter();
  }
  async onAbort(listener) {
    this.abortSubscribers.push(listener);
  }
}, "StreamingApi");

// node_modules/hono/dist/context.js
var __accessCheck = /* @__PURE__ */ __name((obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
}, "__accessCheck");
var __privateGet = /* @__PURE__ */ __name((obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
}, "__privateGet");
var __privateAdd = /* @__PURE__ */ __name((obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
}, "__privateAdd");
var __privateSet = /* @__PURE__ */ __name((obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
}, "__privateSet");
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setHeaders = /* @__PURE__ */ __name((headers, map = {}) => {
  Object.entries(map).forEach(([key, value]) => headers.set(key, value));
  return headers;
}, "setHeaders");
var _status;
var _executionCtx;
var _headers;
var _preparedHeaders;
var _res;
var _isFresh;
var Context = /* @__PURE__ */ __name(class {
  constructor(req, options) {
    this.env = {};
    this._var = {};
    this.finalized = false;
    this.error = void 0;
    __privateAdd(this, _status, 200);
    __privateAdd(this, _executionCtx, void 0);
    __privateAdd(this, _headers, void 0);
    __privateAdd(this, _preparedHeaders, void 0);
    __privateAdd(this, _res, void 0);
    __privateAdd(this, _isFresh, true);
    this.renderer = (content) => this.html(content);
    this.notFoundHandler = () => new Response();
    this.render = (...args) => this.renderer(...args);
    this.setRenderer = (renderer) => {
      this.renderer = renderer;
    };
    this.header = (name, value, options2) => {
      if (value === void 0) {
        if (__privateGet(this, _headers)) {
          __privateGet(this, _headers).delete(name);
        } else if (__privateGet(this, _preparedHeaders)) {
          delete __privateGet(this, _preparedHeaders)[name.toLocaleLowerCase()];
        }
        if (this.finalized) {
          this.res.headers.delete(name);
        }
        return;
      }
      if (options2?.append) {
        if (!__privateGet(this, _headers)) {
          __privateSet(this, _isFresh, false);
          __privateSet(this, _headers, new Headers(__privateGet(this, _preparedHeaders)));
          __privateSet(this, _preparedHeaders, {});
        }
        __privateGet(this, _headers).append(name, value);
      } else {
        if (__privateGet(this, _headers)) {
          __privateGet(this, _headers).set(name, value);
        } else {
          __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
          __privateGet(this, _preparedHeaders)[name.toLowerCase()] = value;
        }
      }
      if (this.finalized) {
        if (options2?.append) {
          this.res.headers.append(name, value);
        } else {
          this.res.headers.set(name, value);
        }
      }
    };
    this.status = (status) => {
      __privateSet(this, _isFresh, false);
      __privateSet(this, _status, status);
    };
    this.set = (key, value) => {
      this._var ?? (this._var = {});
      this._var[key] = value;
    };
    this.get = (key) => {
      return this._var ? this._var[key] : void 0;
    };
    this.newResponse = (data, arg, headers) => {
      if (__privateGet(this, _isFresh) && !headers && !arg && __privateGet(this, _status) === 200) {
        return new Response(data, {
          headers: __privateGet(this, _preparedHeaders)
        });
      }
      if (arg && typeof arg !== "number") {
        const headers2 = setHeaders(new Headers(arg.headers), __privateGet(this, _preparedHeaders));
        return new Response(data, {
          headers: headers2,
          status: arg.status
        });
      }
      const status = typeof arg === "number" ? arg : __privateGet(this, _status);
      __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
      __privateGet(this, _headers) ?? __privateSet(this, _headers, new Headers());
      setHeaders(__privateGet(this, _headers), __privateGet(this, _preparedHeaders));
      if (__privateGet(this, _res)) {
        __privateGet(this, _res).headers.forEach((v, k) => {
          __privateGet(this, _headers)?.set(k, v);
        });
        setHeaders(__privateGet(this, _headers), __privateGet(this, _preparedHeaders));
      }
      headers ?? (headers = {});
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          __privateGet(this, _headers).set(k, v);
        } else {
          __privateGet(this, _headers).delete(k);
          for (const v2 of v) {
            __privateGet(this, _headers).append(k, v2);
          }
        }
      }
      return new Response(data, {
        status,
        headers: __privateGet(this, _headers)
      });
    };
    this.body = (data, arg, headers) => {
      return typeof arg === "number" ? this.newResponse(data, arg, headers) : this.newResponse(data, arg);
    };
    this.text = (text, arg, headers) => {
      if (!__privateGet(this, _preparedHeaders)) {
        if (__privateGet(this, _isFresh) && !headers && !arg) {
          return new Response(text);
        }
        __privateSet(this, _preparedHeaders, {});
      }
      __privateGet(this, _preparedHeaders)["content-type"] = TEXT_PLAIN;
      return typeof arg === "number" ? this.newResponse(text, arg, headers) : this.newResponse(text, arg);
    };
    this.json = (object, arg, headers) => {
      const body = JSON.stringify(object);
      __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
      __privateGet(this, _preparedHeaders)["content-type"] = "application/json; charset=UTF-8";
      return typeof arg === "number" ? this.newResponse(body, arg, headers) : this.newResponse(body, arg);
    };
    this.jsonT = (object, arg, headers) => {
      return this.json(object, arg, headers);
    };
    this.html = (html, arg, headers) => {
      __privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
      __privateGet(this, _preparedHeaders)["content-type"] = "text/html; charset=UTF-8";
      if (typeof html === "object") {
        if (!(html instanceof Promise)) {
          html = html.toString();
        }
        if (html instanceof Promise) {
          return html.then((html2) => resolveCallback(html2, HtmlEscapedCallbackPhase.Stringify, false, {})).then((html2) => {
            return typeof arg === "number" ? this.newResponse(html2, arg, headers) : this.newResponse(html2, arg);
          });
        }
      }
      return typeof arg === "number" ? this.newResponse(html, arg, headers) : this.newResponse(html, arg);
    };
    this.redirect = (location, status = 302) => {
      __privateGet(this, _headers) ?? __privateSet(this, _headers, new Headers());
      __privateGet(this, _headers).set("Location", location);
      return this.newResponse(null, status);
    };
    this.streamText = (cb, arg, headers) => {
      headers ?? (headers = {});
      this.header("content-type", TEXT_PLAIN);
      this.header("x-content-type-options", "nosniff");
      this.header("transfer-encoding", "chunked");
      return this.stream(cb, arg, headers);
    };
    this.stream = (cb, arg, headers) => {
      const { readable, writable } = new TransformStream();
      const stream = new StreamingApi(writable, readable);
      cb(stream).finally(() => stream.close());
      return typeof arg === "number" ? this.newResponse(stream.responseReadable, arg, headers) : this.newResponse(stream.responseReadable, arg);
    };
    this.cookie = (name, value, opt) => {
      const cookie = serialize(name, value, opt);
      this.header("set-cookie", cookie, { append: true });
    };
    this.notFound = () => {
      return this.notFoundHandler(this);
    };
    this.req = req;
    if (options) {
      __privateSet(this, _executionCtx, options.executionCtx);
      this.env = options.env;
      if (options.notFoundHandler) {
        this.notFoundHandler = options.notFoundHandler;
      }
    }
  }
  get event() {
    if (__privateGet(this, _executionCtx) && "respondWith" in __privateGet(this, _executionCtx)) {
      return __privateGet(this, _executionCtx);
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (__privateGet(this, _executionCtx)) {
      return __privateGet(this, _executionCtx);
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    __privateSet(this, _isFresh, false);
    return __privateGet(this, _res) || __privateSet(this, _res, new Response("404 Not Found", { status: 404 }));
  }
  set res(_res2) {
    __privateSet(this, _isFresh, false);
    if (__privateGet(this, _res) && _res2) {
      __privateGet(this, _res).headers.delete("content-type");
      for (const [k, v] of __privateGet(this, _res).headers.entries()) {
        if (k === "set-cookie") {
          const cookies = __privateGet(this, _res).headers.getSetCookie();
          _res2.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res2.headers.append("set-cookie", cookie);
          }
        } else {
          _res2.headers.set(k, v);
        }
      }
    }
    __privateSet(this, _res, _res2);
    this.finalized = true;
  }
  get var() {
    return { ...this._var };
  }
  get runtime() {
    const global = globalThis;
    if (global?.Deno !== void 0) {
      return "deno";
    }
    if (global?.Bun !== void 0) {
      return "bun";
    }
    if (typeof global?.WebSocketPair === "function") {
      return "workerd";
    }
    if (typeof global?.EdgeRuntime === "string") {
      return "edge-light";
    }
    if (global?.fastly !== void 0) {
      return "fastly";
    }
    if (global?.__lagon__ !== void 0) {
      return "lagon";
    }
    if (global?.process?.release?.name === "node") {
      return "node";
    }
    return "other";
  }
}, "Context");
_status = /* @__PURE__ */ new WeakMap();
_executionCtx = /* @__PURE__ */ new WeakMap();
_headers = /* @__PURE__ */ new WeakMap();
_preparedHeaders = /* @__PURE__ */ new WeakMap();
_res = /* @__PURE__ */ new WeakMap();
_isFresh = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        if (context instanceof Context) {
          context.req.routeIndex = i;
        }
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1);
          });
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/http-exception.js
var HTTPException = /* @__PURE__ */ __name(class extends Error {
  constructor(status = 500, options) {
    super(options?.message);
    this.res = options?.res;
    this.status = status;
  }
  getResponse() {
    if (this.res) {
      return this.res;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
}, "HTTPException");

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = { all: false }) => {
  const contentType = request.headers.get("Content-Type");
  if (isFormDataContent(contentType)) {
    return parseFormData(request, options);
  }
  return {};
}, "parseBody");
function isFormDataContent(contentType) {
  if (contentType === null) {
    return false;
  }
  return contentType.startsWith("multipart/form-data") || contentType.startsWith("application/x-www-form-urlencoded");
}
__name(isFormDataContent, "isFormDataContent");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = {};
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] && isArrayField(form[key])) {
    appendToExistingArray(form[key], value);
  } else if (form[key]) {
    convertToNewArray(form, key, value);
  } else {
    form[key] = value;
  }
}, "handleParsingAllValues");
function isArrayField(field) {
  return Array.isArray(field);
}
__name(isArrayField, "isArrayField");
var appendToExistingArray = /* @__PURE__ */ __name((arr, value) => {
  arr.push(value);
}, "appendToExistingArray");
var convertToNewArray = /* @__PURE__ */ __name((form, key, value) => {
  form[key] = [form[key], value];
}, "convertToNewArray");

// node_modules/hono/dist/request.js
var __accessCheck2 = /* @__PURE__ */ __name((obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
}, "__accessCheck");
var __privateGet2 = /* @__PURE__ */ __name((obj, member, getter) => {
  __accessCheck2(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
}, "__privateGet");
var __privateAdd2 = /* @__PURE__ */ __name((obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
}, "__privateAdd");
var __privateSet2 = /* @__PURE__ */ __name((obj, member, value, setter) => {
  __accessCheck2(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
}, "__privateSet");
var _validatedData;
var _matchResult;
var HonoRequest = /* @__PURE__ */ __name(class {
  constructor(request, path = "/", matchResult = [[]]) {
    __privateAdd2(this, _validatedData, void 0);
    __privateAdd2(this, _matchResult, void 0);
    this.routeIndex = 0;
    this.bodyCache = {};
    this.cachedBody = (key) => {
      const { bodyCache, raw: raw2 } = this;
      const cachedBody = bodyCache[key];
      if (cachedBody) {
        return cachedBody;
      }
      if (bodyCache.arrayBuffer) {
        return (async () => {
          return await new Response(bodyCache.arrayBuffer)[key]();
        })();
      }
      return bodyCache[key] = raw2[key]();
    };
    this.raw = request;
    this.path = path;
    __privateSet2(this, _matchResult, matchResult);
    __privateSet2(this, _validatedData, {});
  }
  param(key) {
    return key ? this.getDecodedParam(key) : this.getAllDecodedParams();
  }
  getDecodedParam(key) {
    const paramKey = __privateGet2(this, _matchResult)[0][this.routeIndex][1][key];
    const param2 = this.getParamValue(paramKey);
    return param2 ? /\%/.test(param2) ? decodeURIComponent_(param2) : param2 : void 0;
  }
  getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(__privateGet2(this, _matchResult)[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.getParamValue(__privateGet2(this, _matchResult)[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value;
      }
    }
    return decoded;
  }
  getParamValue(paramKey) {
    return __privateGet2(this, _matchResult)[1] ? __privateGet2(this, _matchResult)[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name.toLowerCase()) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  cookie(key) {
    const cookie = this.raw.headers.get("Cookie");
    if (!cookie) {
      return;
    }
    const obj = parse(cookie);
    if (key) {
      const value = obj[key];
      return value;
    } else {
      return obj;
    }
  }
  async parseBody(options) {
    if (this.bodyCache.parsedBody) {
      return this.bodyCache.parsedBody;
    }
    const parsedBody = await parseBody(this, options);
    this.bodyCache.parsedBody = parsedBody;
    return parsedBody;
  }
  json() {
    return this.cachedBody("json");
  }
  text() {
    return this.cachedBody("text");
  }
  arrayBuffer() {
    return this.cachedBody("arrayBuffer");
  }
  blob() {
    return this.cachedBody("blob");
  }
  formData() {
    return this.cachedBody("formData");
  }
  addValidatedData(target, data) {
    __privateGet2(this, _validatedData)[target] = data;
  }
  valid(target) {
    return __privateGet2(this, _validatedData)[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get matchedRoutes() {
    return __privateGet2(this, _matchResult)[0].map(([[, route]]) => route);
  }
  get routePath() {
    return __privateGet2(this, _matchResult)[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
  get headers() {
    return this.raw.headers;
  }
  get body() {
    return this.raw.body;
  }
  get bodyUsed() {
    return this.raw.bodyUsed;
  }
  get integrity() {
    return this.raw.integrity;
  }
  get keepalive() {
    return this.raw.keepalive;
  }
  get referrer() {
    return this.raw.referrer;
  }
  get signal() {
    return this.raw.signal;
  }
}, "HonoRequest");
_validatedData = /* @__PURE__ */ new WeakMap();
_matchResult = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = /* @__PURE__ */ __name(class extends Error {
}, "UnsupportedPathError");

// node_modules/hono/dist/hono-base.js
var __accessCheck3 = /* @__PURE__ */ __name((obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
}, "__accessCheck");
var __privateGet3 = /* @__PURE__ */ __name((obj, member, getter) => {
  __accessCheck3(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
}, "__privateGet");
var __privateAdd3 = /* @__PURE__ */ __name((obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
}, "__privateAdd");
var __privateSet3 = /* @__PURE__ */ __name((obj, member, value, setter) => {
  __accessCheck3(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
}, "__privateSet");
var COMPOSED_HANDLER = Symbol("composedHandler");
function defineDynamicClass() {
  return class {
  };
}
__name(defineDynamicClass, "defineDynamicClass");
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error(err);
  const message = "Internal Server Error";
  return c.text(message, 500);
}, "errorHandler");
var _path;
var _Hono = /* @__PURE__ */ __name(class extends defineDynamicClass() {
  constructor(options = {}) {
    super();
    this._basePath = "/";
    __privateAdd3(this, _path, "/");
    this.routes = [];
    this.notFoundHandler = notFoundHandler;
    this.errorHandler = errorHandler;
    this.onError = (handler) => {
      this.errorHandler = handler;
      return this;
    };
    this.notFound = (handler) => {
      this.notFoundHandler = handler;
      return this;
    };
    this.head = () => {
      console.warn("`app.head()` is no longer used. `app.get()` implicitly handles the HEAD method.");
      return this;
    };
    this.handleEvent = (event) => {
      return this.dispatch(event.request, event, void 0, event.request.method);
    };
    this.fetch = (request, Env, executionCtx) => {
      return this.dispatch(request, executionCtx, Env, request.method);
    };
    this.request = (input, requestInit, Env, executionCtx) => {
      if (input instanceof Request) {
        if (requestInit !== void 0) {
          input = new Request(input, requestInit);
        }
        return this.fetch(input, Env, executionCtx);
      }
      input = input.toString();
      const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`;
      const req = new Request(path, requestInit);
      return this.fetch(req, Env, executionCtx);
    };
    this.fire = () => {
      addEventListener("fetch", (event) => {
        event.respondWith(this.dispatch(event.request, event, void 0, event.request.method));
      });
    };
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.map((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          __privateSet3(this, _path, args1);
        } else {
          this.addRoute(method, __privateGet3(this, _path), args1);
        }
        args.map((handler) => {
          if (typeof handler !== "string") {
            this.addRoute(method, __privateGet3(this, _path), handler);
          }
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      if (!method) {
        return this;
      }
      __privateSet3(this, _path, path);
      for (const m of [method].flat()) {
        handlers.map((handler) => {
          this.addRoute(m.toUpperCase(), __privateGet3(this, _path), handler);
        });
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        __privateSet3(this, _path, arg1);
      } else {
        handlers.unshift(arg1);
      }
      handlers.map((handler) => {
        this.addRoute(METHOD_NAME_ALL, __privateGet3(this, _path), handler);
      });
      return this;
    };
    const strict = options.strict ?? true;
    delete options.strict;
    Object.assign(this, options);
    this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
  }
  clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.routes = this.routes;
    return clone;
  }
  route(path, app2) {
    const subApp = this.basePath(path);
    if (!app2) {
      return subApp;
    }
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  showRoutes() {
    const length = 8;
    this.routes.map((route) => {
      console.log(
        `\x1B[32m${route.method}\x1B[0m ${" ".repeat(length - route.method.length)} ${route.path}`
      );
    });
  }
  mount(path, applicationHandler, optionHandler) {
    const mergedPath = mergePath(this._basePath, path);
    const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      const options = optionHandler ? optionHandler(c) : [c.env, executionContext];
      const optionsArray = Array.isArray(options) ? options : [options];
      const queryStrings = getQueryStrings(c.req.url);
      const res = await applicationHandler(
        new Request(
          new URL((c.req.path.slice(pathPrefixLength) || "/") + queryStrings, c.req.url),
          c.req.raw
        ),
        ...optionsArray
      );
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  get routerName() {
    this.matchRoute("GET", "/");
    return this.router.name;
  }
  addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  matchRoute(method, path) {
    return this.router.match(method, path);
  }
  handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.matchRoute(method, path);
    const c = new Context(new HonoRequest(request, path, matchResult), {
      env,
      executionCtx,
      notFoundHandler: this.notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.notFoundHandler(c);
        });
      } catch (err) {
        return this.handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.notFoundHandler(c))
      ).catch((err) => this.handleError(err, c)) : res;
    }
    const composed = compose(matchResult[0], this.errorHandler, this.notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. You may forget returning Response object or `await next()`"
          );
        }
        return context.res;
      } catch (err) {
        return this.handleError(err, c);
      }
    })();
  }
}, "_Hono");
var Hono = _Hono;
_path = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = /* @__PURE__ */ __name(class {
  constructor() {
    this.children = {};
  }
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.children[regexpStr];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.children[regexpStr] = new Node();
        if (name !== "") {
          node.varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.varIndex]);
      }
    } else {
      node = this.children[token];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.children[k];
      return (typeof c.varIndex === "number" ? `(${k})@${c.varIndex}` : k) + c.buildRegExpStr();
    });
    if (typeof this.index === "number") {
      strList.unshift(`#${this.index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
}, "Node");

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = /* @__PURE__ */ __name(class {
  constructor() {
    this.context = { varIndex: 0 };
    this.root = new Node();
  }
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.root.insert(tokens, index, paramAssoc, this.context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (typeof handlerIndex !== "undefined") {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (typeof paramIndex !== "undefined") {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
}, "Trie");

// node_modules/hono/dist/router/reg-exp-router/router.js
var methodNames = [METHOD_NAME_ALL, ...METHODS].map((method) => method.toUpperCase());
var emptyParam = [];
var nullMatcher = [/^$/, [], {}];
var wildcardRegExpCache = {};
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ?? (wildcardRegExpCache[path] = new RegExp(
    path === "*" ? "" : `^${path.replace(/\/\*/, "(?:|/.*)")}$`
  ));
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = {};
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = {};
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, {}]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = {};
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = /* @__PURE__ */ __name(class {
  constructor() {
    this.name = "RegExpRouter";
    this.middleware = { [METHOD_NAME_ALL]: {} };
    this.routes = { [METHOD_NAME_ALL]: {} };
  }
  add(method, path, handler) {
    var _a;
    const { middleware, routes } = this;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (methodNames.indexOf(method) === -1) {
      methodNames.push(method);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = {};
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          var _a2;
          (_a2 = middleware[m])[path] || (_a2[path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
        });
      } else {
        (_a = middleware[method])[path] || (_a[path] = findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        var _a2;
        if (method === METHOD_NAME_ALL || method === m) {
          (_a2 = routes[m])[path2] || (_a2[path2] = [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ]);
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  buildAllMatchers() {
    const matchers = {};
    methodNames.forEach((method) => {
      matchers[method] = this.buildMatcher(method) || matchers[METHOD_NAME_ALL];
    });
    this.middleware = this.routes = void 0;
    return matchers;
  }
  buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.middleware, this.routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute || (hasOwnRoute = true);
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
}, "RegExpRouter");

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = /* @__PURE__ */ __name(class {
  constructor(init) {
    this.name = "SmartRouter";
    this.routers = [];
    this.routes = [];
    Object.assign(this, init);
  }
  add(method, path, handler) {
    if (!this.routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.routes) {
      throw new Error("Fatal error");
    }
    const { routers, routes } = this;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        routes.forEach((args) => {
          router.add(...args);
        });
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.routers = [router];
      this.routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.routes || this.routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.routers[0];
  }
}, "SmartRouter");

// node_modules/hono/dist/router/trie-router/node.js
var Node2 = /* @__PURE__ */ __name(class {
  constructor(method, handler, children) {
    this.order = 0;
    this.params = {};
    this.children = children || {};
    this.methods = [];
    this.name = "";
    if (method && handler) {
      const m = {};
      m[method] = { handler, possibleKeys: [], score: 0, name: this.name };
      this.methods = [m];
    }
    this.patterns = [];
  }
  insert(method, path, handler) {
    this.name = `${method} ${path}`;
    this.order = ++this.order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    const parentPatterns = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      if (Object.keys(curNode.children).includes(p)) {
        parentPatterns.push(...curNode.patterns);
        curNode = curNode.children[p];
        const pattern2 = getPattern(p);
        if (pattern2) {
          possibleKeys.push(pattern2[1]);
        }
        continue;
      }
      curNode.children[p] = new Node2();
      const pattern = getPattern(p);
      if (pattern) {
        curNode.patterns.push(pattern);
        parentPatterns.push(...curNode.patterns);
        possibleKeys.push(pattern[1]);
      }
      parentPatterns.push(...curNode.patterns);
      curNode = curNode.children[p];
    }
    if (!curNode.methods.length) {
      curNode.methods = [];
    }
    const m = {};
    const handlerSet = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      name: this.name,
      score: this.order
    };
    m[method] = handlerSet;
    curNode.methods.push(m);
    return curNode;
  }
  gHSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.methods.length; i < len; i++) {
      const m = node.methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = {};
        handlerSet.possibleKeys.forEach((key) => {
          const processed = processedSet[handlerSet.name];
          handlerSet.params[key] = params[key] && !processed ? params[key] : nodeParams[key] ?? params[key];
          processedSet[handlerSet.name] = true;
        });
        handlerSets.push(handlerSet);
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.params = {};
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.children[part];
        if (nextNode) {
          nextNode.params = node.params;
          if (isLast === true) {
            if (nextNode.children["*"]) {
              handlerSets.push(...this.gHSets(nextNode.children["*"], method, node.params, {}));
            }
            handlerSets.push(...this.gHSets(nextNode, method, node.params, {}));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
          const pattern = node.patterns[k];
          const params = { ...node.params };
          if (pattern === "*") {
            const astNode = node.children["*"];
            if (astNode) {
              handlerSets.push(...this.gHSets(astNode, method, node.params, {}));
              tempNodes.push(astNode);
            }
            continue;
          }
          if (part === "") {
            continue;
          }
          const [key, name, matcher] = pattern;
          const child = node.children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp && matcher.test(restPathString)) {
            params[name] = restPathString;
            handlerSets.push(...this.gHSets(child, method, node.params, params));
            continue;
          }
          if (matcher === true || matcher instanceof RegExp && matcher.test(part)) {
            if (typeof key === "string") {
              params[name] = part;
              if (isLast === true) {
                handlerSets.push(...this.gHSets(child, method, params, node.params));
                if (child.children["*"]) {
                  handlerSets.push(...this.gHSets(child.children["*"], method, params, node.params));
                }
              } else {
                child.params = params;
                tempNodes.push(child);
              }
            }
          }
        }
      }
      curNodes = tempNodes;
    }
    const results = handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [results.map(({ handler, params }) => [handler, params])];
  }
}, "Node");

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(class {
  constructor() {
    this.name = "TrieRouter";
    this.node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (const p of results) {
        this.node.insert(method, p, handler);
      }
      return;
    }
    this.node.insert(method, path, handler);
  }
  match(method, path) {
    return this.node.search(method, path);
  }
}, "TrieRouter");

// node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, "Hono");

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      return () => optsOrigin;
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : optsOrigin[0];
    }
  })(opts.origin);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = findAllowOrigin(c.req.header("origin") || "");
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      set("Vary", "Origin");
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      if (opts.allowMethods?.length) {
        set("Access-Control-Allow-Methods", opts.allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: c.res.statusText
      });
    }
    await next();
  }, "cors2");
}, "cors");

// node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name((times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
}, "humanize");
var time = /* @__PURE__ */ __name((start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
}, "time");
var colorStatus = /* @__PURE__ */ __name((status) => {
  const out = {
    7: `\x1B[35m${status}\x1B[0m`,
    5: `\x1B[31m${status}\x1B[0m`,
    4: `\x1B[33m${status}\x1B[0m`,
    3: `\x1B[36m${status}\x1B[0m`,
    2: `\x1B[32m${status}\x1B[0m`,
    1: `\x1B[32m${status}\x1B[0m`,
    0: `\x1B[33m${status}\x1B[0m`
  };
  const calculateStatus = status / 100 | 0;
  return out[calculateStatus];
}, "colorStatus");
function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `  ${prefix} ${method} ${path}` : `  ${prefix} ${method} ${path} ${colorStatus(status)} ${elapsed}`;
  fn(out);
}
__name(log, "log");
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method } = c.req;
    const path = getPath(c.req.raw);
    log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    log(fn, "-->", method, path, c.res.status, time(start));
  }, "logger2");
}, "logger");

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    const obj2 = parse(cookie, key);
    return obj2[key];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");
var setCookie = /* @__PURE__ */ __name((c, name, value, opt) => {
  const cookie = serialize(name, value, { path: "/", ...opt });
  c.header("set-cookie", cookie, { append: true });
}, "setCookie");

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/hono/dist/validator/validator.js
var validator = /* @__PURE__ */ __name((target, validationFunc) => {
  return async (c, next) => {
    let value = {};
    const contentType = c.req.header("Content-Type");
    switch (target) {
      case "json":
        if (!contentType || !contentType.startsWith("application/json")) {
          const message = `Invalid HTTP header: Content-Type=${contentType}`;
          console.error(message);
          return c.json(
            {
              success: false,
              message
            },
            400
          );
        }
        try {
          const arrayBuffer = c.req.bodyCache.arrayBuffer ?? await c.req.raw.arrayBuffer();
          value = await new Response(arrayBuffer).json();
          c.req.bodyCache.json = value;
          c.req.bodyCache.arrayBuffer = arrayBuffer;
        } catch {
          console.error("Error: Malformed JSON in request body");
          return c.json(
            {
              success: false,
              message: "Malformed JSON in request body"
            },
            400
          );
        }
        break;
      case "form": {
        try {
          const contentType2 = c.req.header("Content-Type");
          if (contentType2) {
            const arrayBuffer = c.req.bodyCache.arrayBuffer ?? await c.req.raw.arrayBuffer();
            const formData = await bufferToFormData(arrayBuffer, contentType2);
            const form = {};
            formData.forEach((value2, key) => {
              form[key] = value2;
            });
            value = form;
            c.req.bodyCache.formData = formData;
            c.req.bodyCache.arrayBuffer = arrayBuffer;
          }
        } catch (e) {
          let message = "Malformed FormData request.";
          message += e instanceof Error ? ` ${e.message}` : ` ${String(e)}`;
          return c.json(
            {
              success: false,
              message
            },
            400
          );
        }
        break;
      }
      case "query":
        value = Object.fromEntries(
          Object.entries(c.req.queries()).map(([k, v]) => {
            return v.length === 1 ? [k, v[0]] : [k, v];
          })
        );
        break;
      case "queries":
        value = c.req.queries();
        console.log("Warnings: Validate type `queries` is deprecated. Use `query` instead.");
        break;
      case "param":
        value = c.req.param();
        break;
      case "header":
        value = c.req.header();
        break;
      case "cookie":
        value = getCookie(c);
        break;
    }
    const res = await validationFunc(value, c);
    if (res instanceof Response) {
      return res;
    }
    c.req.addValidatedData(target, res);
    await next();
  };
}, "validator");

// node_modules/hono/dist/utils/jwt/jwt.js
var jwt_exports = {};
__export(jwt_exports, {
  decode: () => decode,
  sign: () => sign,
  verify: () => verify
});

// node_modules/hono/dist/utils/encode.js
var decodeBase64Url = /* @__PURE__ */ __name((str) => {
  return decodeBase64(str.replace(/_|-/g, (m) => ({ _: "/", "-": "+" })[m] ?? m));
}, "decodeBase64Url");
var encodeBase64Url = /* @__PURE__ */ __name((buf) => encodeBase64(buf).replace(/\/|\+/g, (m) => ({ "/": "_", "+": "-" })[m] ?? m), "encodeBase64Url");
var encodeBase64 = /* @__PURE__ */ __name((buf) => {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}, "encodeBase64");
var decodeBase64 = /* @__PURE__ */ __name((str) => {
  const binary = atob(str);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  const half = binary.length / 2;
  for (let i = 0, j = binary.length - 1; i <= half; i++, j--) {
    bytes[i] = binary.charCodeAt(i);
    bytes[j] = binary.charCodeAt(j);
  }
  return bytes;
}, "decodeBase64");

// node_modules/hono/dist/utils/jwt/types.js
var JwtAlgorithmNotImplemented = /* @__PURE__ */ __name(class extends Error {
  constructor(alg) {
    super(`${alg} is not an implemented algorithm`);
    this.name = "JwtAlgorithmNotImplemented";
  }
}, "JwtAlgorithmNotImplemented");
var JwtTokenInvalid = /* @__PURE__ */ __name(class extends Error {
  constructor(token) {
    super(`invalid JWT token: ${token}`);
    this.name = "JwtTokenInvalid";
  }
}, "JwtTokenInvalid");
var JwtTokenNotBefore = /* @__PURE__ */ __name(class extends Error {
  constructor(token) {
    super(`token (${token}) is being used before it's valid`);
    this.name = "JwtTokenNotBefore";
  }
}, "JwtTokenNotBefore");
var JwtTokenExpired = /* @__PURE__ */ __name(class extends Error {
  constructor(token) {
    super(`token (${token}) expired`);
    this.name = "JwtTokenExpired";
  }
}, "JwtTokenExpired");
var JwtTokenIssuedAt = /* @__PURE__ */ __name(class extends Error {
  constructor(currentTimestamp, iat) {
    super(`Incorrect "iat" claim must be a older than "${currentTimestamp}" (iat: "${iat}")`);
    this.name = "JwtTokenIssuedAt";
  }
}, "JwtTokenIssuedAt");
var JwtTokenSignatureMismatched = /* @__PURE__ */ __name(class extends Error {
  constructor(token) {
    super(`token(${token}) signature mismatched`);
    this.name = "JwtTokenSignatureMismatched";
  }
}, "JwtTokenSignatureMismatched");

// node_modules/hono/dist/utils/jwt/jwt.js
var utf8Encoder = new TextEncoder();
var utf8Decoder = new TextDecoder();
var encodeJwtPart = /* @__PURE__ */ __name((part) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(part))).replace(/=/g, ""), "encodeJwtPart");
var encodeSignaturePart = /* @__PURE__ */ __name((buf) => encodeBase64Url(buf).replace(/=/g, ""), "encodeSignaturePart");
var decodeJwtPart = /* @__PURE__ */ __name((part) => JSON.parse(utf8Decoder.decode(decodeBase64Url(part))), "decodeJwtPart");
var param = /* @__PURE__ */ __name((name) => {
  switch (name.toUpperCase()) {
    case "HS256":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-256"
        }
      };
    case "HS384":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-384"
        }
      };
    case "HS512":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-512"
        }
      };
    default:
      throw new JwtAlgorithmNotImplemented(name);
  }
}, "param");
var signing = /* @__PURE__ */ __name(async (data, secret, alg = "HS256") => {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.");
  }
  const utf8Encoder2 = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    utf8Encoder2.encode(secret),
    param(alg),
    false,
    [
      "sign"
      /* Sign */
    ]
  );
  return await crypto.subtle.sign(param(alg), cryptoKey, utf8Encoder2.encode(data));
}, "signing");
var sign = /* @__PURE__ */ __name(async (payload, secret, alg = "HS256") => {
  const encodedPayload = encodeJwtPart(payload);
  const encodedHeader = encodeJwtPart({ alg, typ: "JWT" });
  const partialToken = `${encodedHeader}.${encodedPayload}`;
  const signaturePart = await signing(partialToken, secret, alg);
  const signature = encodeSignaturePart(signaturePart);
  return `${partialToken}.${signature}`;
}, "sign");
var verify = /* @__PURE__ */ __name(async (token, secret, alg = "HS256") => {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token);
  }
  const { payload } = decode(token);
  const now = Math.floor(Date.now() / 1e3);
  if (payload.nbf && payload.nbf > now) {
    throw new JwtTokenNotBefore(token);
  }
  if (payload.exp && payload.exp <= now) {
    throw new JwtTokenExpired(token);
  }
  if (payload.iat && now < payload.iat) {
    throw new JwtTokenIssuedAt(now, payload.iat);
  }
  const signaturePart = tokenParts.slice(0, 2).join(".");
  const signature = await signing(signaturePart, secret, alg);
  const encodedSignature = encodeSignaturePart(signature);
  if (encodedSignature !== tokenParts[2]) {
    throw new JwtTokenSignatureMismatched(token);
  }
  return payload;
}, "verify");
var decode = /* @__PURE__ */ __name((token) => {
  try {
    const [h, p] = token.split(".");
    const header = decodeJwtPart(h);
    const payload = decodeJwtPart(p);
    return {
      header,
      payload
    };
  } catch (e) {
    throw new JwtTokenInvalid(token);
  }
}, "decode");

// node_modules/hono/dist/middleware/jwt/index.js
var verify2 = jwt_exports.verify;
var decode2 = jwt_exports.decode;
var sign2 = jwt_exports.sign;

// src/utils/auth.ts
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(hashBuffer);
  const saltArray = new Uint8Array(salt);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(saltArray);
  combined.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...combined));
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hash) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const combined = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      data,
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 1e5,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    const hashArray = new Uint8Array(hashBuffer);
    return hashArray.every((byte, i) => byte === storedHash[i]);
  } catch {
    return false;
  }
}
__name(verifyPassword, "verifyPassword");
async function createToken(userId, email, secret, additionalClaims) {
  const payload = {
    id: userId,
    email,
    exp: Math.floor(Date.now() / 1e3) + 3 * 24 * 60 * 60,
    // 3 days
    ...additionalClaims
    // Allow additional claims like isAdmin, role, etc.
  };
  return await sign2(payload, secret);
}
__name(createToken, "createToken");
async function verifyToken(token, secret) {
  try {
    const payload = await verify2(token, secret);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
function generateId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(generateId, "generateId");

// src/routes/auth.ts
var auth = new Hono2();
var signupSchema = validator("json", (value, c) => {
  const email = value["email"];
  const password = value["password"];
  if (!email || typeof email !== "string") {
    return c.json({ status: "fail", message: "Please enter a valid email" }, 400);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ status: "fail", message: "Please enter a valid email" }, 400);
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return c.json({ status: "fail", message: "Minimum password length is 6 characters" }, 400);
  }
  return { email: email.toLowerCase().trim(), password };
});
var loginSchema = validator("json", (value, c) => {
  const email = value["email"];
  const password = value["password"];
  if (!email || !password) {
    return c.json({ status: "fail", message: "Email and password are required" }, 400);
  }
  return { email: email.toLowerCase().trim(), password };
});
auth.post("/signup", signupSchema, async (c) => {
  const { email, password } = c.req.valid("json");
  const db = c.env.DB;
  try {
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
      return c.json({ status: "fail", message: "This account is already registered" }, 400);
    }
    const passwordHash = await hashPassword(password);
    const userId = generateId();
    await db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").bind(userId, email, passwordHash).run();
    const defaultProfiles = [
      {
        user_id: userId,
        profile_index: 0,
        name: "Add Profile",
        img: "/images/addProfile.svg",
        is_profile: false
      },
      {
        user_id: userId,
        profile_index: 1,
        name: "kids",
        img: "https://dl.dropboxusercontent.com/scl/fi/k2lrec356rb6ecrjlh46c/kids.png?rlkey=t0wwdggp85hj0g562vc6u4apz&dl=0",
        is_profile: true
      }
    ];
    for (const profile of defaultProfiles) {
      await db.prepare(
        "INSERT INTO profiles (user_id, profile_index, name, img, is_profile) VALUES (?, ?, ?, ?, ?)"
      ).bind(
        profile.user_id,
        profile.profile_index,
        profile.name,
        profile.img,
        profile.is_profile ? 1 : 0
      ).run();
    }
    const token = await createToken(userId, email, c.env.JWT_SECRET);
    setCookie(c, "jwt", token, {
      httpOnly: true,
      maxAge: 3 * 24 * 60 * 60,
      // 3 days
      sameSite: "None",
      secure: true
    });
    return c.json({
      status: "success",
      data: userId
    }, 201);
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ status: "fail", message: "Failed to create account" }, 500);
  }
});
auth.post("/login", loginSchema, async (c) => {
  const { email, password } = c.req.valid("json");
  const db = c.env.DB;
  try {
    const user = await db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      return c.json({ status: "fail", message: "This account does not exist" }, 404);
    }
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ status: "fail", message: "Incorrect password" }, 401);
    }
    const token = await createToken(user.id, user.email, c.env.JWT_SECRET);
    setCookie(c, "jwt", token, {
      httpOnly: true,
      maxAge: 3 * 24 * 60 * 60,
      // 3 days
      sameSite: "None",
      secure: true
    });
    return c.json({
      status: "success",
      data: user.id
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ status: "fail", message: "Login failed" }, 500);
  }
});
auth.post("/logout", (c) => {
  setCookie(c, "jwt", "", {
    httpOnly: true,
    maxAge: 1,
    sameSite: "None",
    secure: true
  });
  return c.json({
    status: "success",
    message: "logged out"
  });
});
var auth_default = auth;

// src/middleware/auth.ts
async function requireAuth(c, next) {
  const token = getCookie(c, "jwt");
  if (!token) {
    return c.json({
      status: "fail",
      data: false
    }, 400);
  }
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({
      status: "fail",
      data: false
    }, 400);
  }
  c.set("userId", payload.id);
  c.set("userEmail", payload.email);
  await next();
}
__name(requireAuth, "requireAuth");

// src/routes/users.ts
var users = new Hono2();
users.get("/", async (c) => {
  const db = c.env.DB;
  try {
    const result = await db.prepare("SELECT id, email, created_at FROM users").all();
    return c.json({
      status: "success",
      result: result.results.length,
      data: result.results
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch users"
    }, 404);
  }
});
users.get("/auth", requireAuth, async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  try {
    const user = await db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return c.json({
        status: "fail",
        message: "User not found"
      }, 404);
    }
    const profiles2 = await db.prepare("SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index").bind(userId).all();
    const userData = {
      _id: user.id,
      email: user.email,
      subProfile: profiles2.results.map((profile) => ({
        id: profile.profile_index,
        name: profile.name,
        img: profile.img,
        isProfile: profile.is_profile,
        watchList: []
        // Will be populated separately if needed
      })),
      createdAt: user.created_at
    };
    return c.json({
      status: "success",
      data: userData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch user"
    }, 404);
  }
});
users.get("/:id", async (c) => {
  const userId = c.req.param("id");
  const db = c.env.DB;
  try {
    const user = await db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return c.json({
        status: "fail",
        message: "User not found"
      }, 404);
    }
    const profiles2 = await db.prepare("SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index").bind(userId).all();
    const userData = {
      _id: user.id,
      email: user.email,
      subProfile: profiles2.results.map((profile) => ({
        id: profile.profile_index,
        name: profile.name,
        img: profile.img,
        isProfile: profile.is_profile,
        watchList: []
      })),
      createdAt: user.created_at
    };
    return c.json({
      status: "success",
      data: userData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch user"
    }, 404);
  }
});
users.patch("/:id", async (c) => {
  const userId = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.DB;
  try {
    if (body.email) {
      await db.prepare("UPDATE users SET email = ? WHERE id = ?").bind(body.email, userId).run();
    }
    if (body.subProfile) {
    }
    return c.json({
      status: "success",
      data: { id: userId }
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to update user"
    }, 400);
  }
});
users.delete("/:id", async (c) => {
  const userId = c.req.param("id");
  const db = c.env.DB;
  try {
    await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return c.json({
      status: "success"
    }, 204);
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to delete user"
    }, 400);
  }
});
var users_default = users;

// src/routes/profiles.ts
var profiles = new Hono2();
profiles.get("/:id/subProfiles", async (c) => {
  const userId = c.req.param("id");
  const db = c.env.DB;
  try {
    const result = await db.prepare("SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index").bind(userId).all();
    let profileList = result.results.map((profile) => ({
      id: profile.profile_index,
      name: profile.name,
      img: profile.img,
      isProfile: profile.is_profile,
      watchList: []
    }));
    if (profileList.length > 5) {
      profileList = profileList.filter((item) => item.id !== 0);
    }
    return c.json({
      status: "success",
      result: profileList.length,
      data: profileList
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch profiles"
    }, 404);
  }
});
profiles.post("/:id/subProfiles", async (c) => {
  const userId = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.DB;
  try {
    const countResult = await db.prepare("SELECT MAX(profile_index) as max_index FROM profiles WHERE user_id = ?").bind(userId).first();
    const newIndex = (countResult?.max_index ?? -1) + 1;
    const profileId = generateId();
    await db.prepare(
      "INSERT INTO profiles (id, user_id, profile_index, name, img, is_profile) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(profileId, userId, newIndex, body.name, body.img, 1).run();
    return c.json({
      status: "success",
      data: {
        id: newIndex,
        name: body.name,
        img: body.img,
        isProfile: true,
        watchList: []
      }
    }, 201);
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to create profile"
    }, 400);
  }
});
profiles.patch("/:id/subProfiles/:subId", async (c) => {
  const userId = c.req.param("id");
  const subId = parseInt(c.req.param("subId"));
  const body = await c.req.json();
  const db = c.env.DB;
  try {
    const updates = [];
    const values = [];
    if (body.name) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.img) {
      updates.push("img = ?");
      values.push(body.img);
    }
    if (body.watchList) {
    }
    if (updates.length > 0) {
      values.push(userId, subId);
      await db.prepare(`UPDATE profiles SET ${updates.join(", ")} WHERE user_id = ? AND profile_index = ?`).bind(...values).run();
    }
    return c.json({
      status: "success",
      data: { id: subId }
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to update profile"
    }, 400);
  }
});
profiles.delete("/:id/subProfiles/:subId", async (c) => {
  const userId = c.req.param("id");
  const subId = parseInt(c.req.param("subId"));
  const db = c.env.DB;
  try {
    await db.prepare("DELETE FROM profiles WHERE user_id = ? AND profile_index = ?").bind(userId, subId).run();
    const remaining = await db.prepare("SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index").bind(userId).all();
    for (let i = 0; i < remaining.results.length; i++) {
      const profile = remaining.results[i];
      if (profile.profile_index > 1 && profile.profile_index !== i) {
        await db.prepare("UPDATE profiles SET profile_index = ? WHERE id = ?").bind(i, profile.id).run();
      }
    }
    return c.json({
      status: "success"
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to delete profile"
    }, 400);
  }
});
profiles.get("/:id/subProfiles/:subId/watchlist", async (c) => {
  const userId = c.req.param("id");
  const subId = parseInt(c.req.param("subId"));
  const db = c.env.DB;
  try {
    const profile = await db.prepare("SELECT id FROM profiles WHERE user_id = ? AND profile_index = ?").bind(userId, subId).first();
    if (!profile) {
      return c.json({
        status: "fail",
        message: "Profile not found"
      }, 404);
    }
    const watchlist = await db.prepare("SELECT * FROM watchlist WHERE profile_id = ? ORDER BY added_at DESC").bind(profile.id).all();
    return c.json({
      status: "success",
      data: watchlist.results
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch watchlist"
    }, 404);
  }
});
profiles.post("/:id/subProfiles/:subId/watchlist", async (c) => {
  const userId = c.req.param("id");
  const subId = parseInt(c.req.param("subId"));
  const body = await c.req.json();
  const db = c.env.DB;
  try {
    const profile = await db.prepare("SELECT id FROM profiles WHERE user_id = ? AND profile_index = ?").bind(userId, subId).first();
    if (!profile) {
      return c.json({
        status: "fail",
        message: "Profile not found"
      }, 404);
    }
    await db.prepare(
      "INSERT OR REPLACE INTO watchlist (profile_id, movie_id, title, poster_path, backdrop_path, media_type) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      profile.id,
      body.movie_id || body.id,
      body.title || body.name,
      body.poster_path,
      body.backdrop_path,
      body.media_type || "movie"
    ).run();
    return c.json({
      status: "success",
      data: body
    }, 201);
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to add to watchlist"
    }, 400);
  }
});
profiles.get("/profileIcons", async (c) => {
  const db = c.env.DB;
  try {
    const icons = await db.prepare("SELECT * FROM profile_icons").all();
    return c.json({
      status: "success",
      result: icons.results.length,
      data: icons.results
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch profile icons"
    }, 404);
  }
});
var profiles_default = profiles;

// src/routes/movies.ts
var movies = new Hono2();
function generateMockVideo(id, category, badge) {
  const titles = [
    "Breaking: Major Development in Phnom Penh",
    "Traditional Khmer Dance Performance",
    "Cambodia Tech Startup Success Story",
    "Angkor Wat Documentary Special",
    "Comedy Night at BAM Studios",
    "Live Concert: Khmer Music Festival",
    "Street Food Tour: Best of Cambodia",
    "BAM Exclusive: Behind the Scenes",
    "Community Heroes: Local Impact",
    "Sports Highlights: National Team Victory"
  ];
  return {
    id: `video_${category}_${id}`,
    title: titles[id % titles.length],
    description: "Experience the best of Cambodian content on BAM",
    thumbnail: `https://picsum.photos/seed/${category}${id}/640/360`,
    preview_url: "/preview.mp4",
    video_url: "/full_video.mp4",
    category,
    views: Math.floor(Math.random() * 5e6),
    duration: `${Math.floor(Math.random() * 30)}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")}`,
    progress: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0,
    badge,
    release_date: "2024-01-01",
    vote_average: 7.5 + Math.random() * 2.5
  };
}
__name(generateMockVideo, "generateMockVideo");
movies.post("/browse", async (c) => {
  const { region = "KH" } = await c.req.json();
  const env = c.env;
  try {
    const heroContent = Array.from(
      { length: 5 },
      (_, i) => generateMockVideo(i, "featured", "Featured")
    );
    const browseData = [
      {
        _id: 0,
        title: "Hero Carousel",
        type: "hero",
        shortList: false,
        movies: heroContent
      },
      {
        _id: 1,
        title: "You May Like It!",
        type: "personalized",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "recommended"))
      },
      {
        _id: 2,
        title: "People Keep Watching It!",
        type: "continue",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "popular");
          video.progress = 20 + Math.floor(Math.random() * 60);
          return video;
        })
      },
      {
        _id: 3,
        title: "OMG! (Controversial)",
        type: "viral",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "controversial", "OMG!")
        )
      },
      {
        _id: 4,
        title: "The World Is Watching Cambodia!",
        type: "global",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "cambodia", "Global Spotlight")
        )
      },
      {
        _id: 5,
        title: "Best Hit!",
        type: "trending",
        shortList: true,
        movies: Array.from({ length: 10 }, (_, i) => {
          const video = generateMockVideo(i, "trending", `#${i + 1}`);
          video.views = 5e6 - i * 4e5;
          return video;
        })
      },
      {
        _id: 6,
        title: "Laughing Is Good!",
        type: "comedy",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "comedy", "\u{1F602}")
        )
      },
      {
        _id: 7,
        title: "BAM Originals",
        type: "originals",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "originals", "BAM Original")
        )
      },
      {
        _id: 8,
        title: "Don't Miss the Event",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 6 }, (_, i) => {
          const video = generateMockVideo(i, "events", "Live Event");
          video.title = `BAM Festival ${(/* @__PURE__ */ new Date()).getFullYear()} - Day ${i + 1}`;
          return video;
        })
      },
      {
        _id: 9,
        title: "Community Pick",
        type: "community",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "community", "Community Pick")
        )
      },
      {
        _id: 10,
        title: "My List",
        shortList: false,
        movies: []
        // Will be populated from user's watchlist
      }
    ];
    const response = {
      status: "success",
      result: browseData.length,
      data: browseData
    };
    const cacheKey = `browse:${region}`;
    await env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: 3600
    });
    return c.json(response);
  } catch (error) {
    console.error("Browse error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch browse data"
    }, 500);
  }
});
movies.post("/browse/politics", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const politicsData = [
      {
        _id: 0,
        title: "Latest Political News",
        type: "politics",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "politics");
          video.title = `Political Update: ${["Parliament Session", "Policy Discussion", "Minister Interview", "Economic Forum"][i % 4]}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Government Announcements",
        type: "politics",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "government", "Official"))
      },
      {
        _id: 2,
        title: "Political Analysis",
        type: "politics",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "analysis"))
      }
    ];
    return c.json({
      status: "success",
      result: politicsData.length,
      data: politicsData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch politics content"
    }, 500);
  }
});
movies.post("/browse/world", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const worldData = [
      {
        _id: 0,
        title: "International News",
        type: "world",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "world");
          video.title = `World News: ${["Asia Pacific", "Europe", "Americas", "Africa"][i % 4]} Update`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Global Economy",
        type: "world",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "economy"))
      },
      {
        _id: 2,
        title: "International Relations",
        type: "world",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "diplomacy"))
      }
    ];
    return c.json({
      status: "success",
      result: worldData.length,
      data: worldData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch world content"
    }, 500);
  }
});
movies.post("/browse/music", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const musicData = [
      {
        _id: 0,
        title: "Khmer Music Hits",
        type: "music",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "music", "\u{1F3B5}");
          video.title = `Top Khmer Songs ${(/* @__PURE__ */ new Date()).getFullYear()}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Live Concerts",
        type: "music",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "concerts", "Live"))
      },
      {
        _id: 2,
        title: "Music Videos",
        type: "music",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "music-videos"))
      }
    ];
    return c.json({
      status: "success",
      result: musicData.length,
      data: musicData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch music content"
    }, 500);
  }
});
movies.post("/browse/cars-motos", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const carsData = [
      {
        _id: 0,
        title: "Car Reviews",
        type: "cars",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "cars", "\u{1F697}");
          video.title = `${["Toyota", "Honda", "Lexus", "BMW"][i % 4]} ${(/* @__PURE__ */ new Date()).getFullYear()} Review`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Motorcycle Culture",
        type: "motos",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "motos", "\u{1F3CD}\uFE0F"))
      },
      {
        _id: 2,
        title: "Auto Shows & Events",
        type: "auto-events",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "auto-shows"))
      }
    ];
    return c.json({
      status: "success",
      result: carsData.length,
      data: carsData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch cars & motos content"
    }, 500);
  }
});
movies.post("/browse/sports", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const sportsData = [
      {
        _id: 0,
        title: "Football Highlights",
        type: "sports",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "football", "\u26BD");
          video.title = `Cambodia vs ${["Thailand", "Vietnam", "Philippines", "Malaysia"][i % 4]}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Kun Khmer Boxing",
        type: "sports",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "boxing", "\u{1F94A}"))
      },
      {
        _id: 2,
        title: "SEA Games Highlights",
        type: "sports",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "seagames", "\u{1F3C5}"))
      }
    ];
    return c.json({
      status: "success",
      result: sportsData.length,
      data: sportsData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch sports content"
    }, 500);
  }
});
movies.post("/browse/travel", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const travelData = [
      {
        _id: 0,
        title: "Discover Cambodia",
        type: "travel",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "travel", "\u2708\uFE0F");
          video.title = `Explore ${["Siem Reap", "Phnom Penh", "Sihanoukville", "Kampot"][i % 4]}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Hidden Gems",
        type: "travel",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "hidden-gems", "\u{1F48E}"))
      },
      {
        _id: 2,
        title: "Food & Culture Tours",
        type: "travel",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "food-culture", "\u{1F35C}"))
      }
    ];
    return c.json({
      status: "success",
      result: travelData.length,
      data: travelData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch travel content"
    }, 500);
  }
});
movies.post("/browse/made-in-cambodia", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const cambodiaData = [
      {
        _id: 0,
        title: "Khmer Movies & Series",
        type: "cambodia",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "khmer-movies", "\u{1F1F0}\u{1F1ED}")
        )
      },
      {
        _id: 1,
        title: "Local Businesses Success",
        type: "cambodia",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "business", "Made in KH"))
      },
      {
        _id: 2,
        title: "Cambodian Innovations",
        type: "cambodia",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "innovation", "\u{1F680}"))
      }
    ];
    return c.json({
      status: "success",
      result: cambodiaData.length,
      data: cambodiaData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch Made in Cambodia content"
    }, 500);
  }
});
movies.post("/browse/latest", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const latestData = [
      {
        _id: 0,
        title: "Just Added Today",
        type: "latest",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, "latest", "New");
          video.release_date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          return video;
        })
      },
      {
        _id: 1,
        title: "This Week's Uploads",
        type: "latest",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "week", "This Week"))
      },
      {
        _id: 2,
        title: "Trending Now",
        type: "latest",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "trending-now", "\u{1F525}"))
      }
    ];
    return c.json({
      status: "success",
      result: latestData.length,
      data: latestData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch latest content"
    }, 500);
  }
});
movies.post("/browse/events", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const eventsData = [
      {
        _id: 0,
        title: "Upcoming BAM Events",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 6 }, (_, i) => {
          const video = generateMockVideo(i, "upcoming", "Upcoming");
          video.title = `BAM ${["Music Festival", "Comedy Night", "Tech Summit", "Film Festival"][i % 4]} ${(/* @__PURE__ */ new Date()).getFullYear()}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Past Event Highlights",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "past-events", "Replay"))
      },
      {
        _id: 2,
        title: "Live Streaming Events",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 6 }, (_, i) => generateMockVideo(i, "live", "\u{1F534} LIVE"))
      }
    ];
    return c.json({
      status: "success",
      result: eventsData.length,
      data: eventsData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch events content"
    }, 500);
  }
});
movies.post("/browse/kids", async (c) => {
  const { region = "KH" } = await c.req.json();
  try {
    const kidsData = [
      {
        _id: 0,
        title: "Educational Shows",
        type: "kids",
        shortList: false,
        movies: Array.from(
          { length: 18 },
          (_, i) => generateMockVideo(i, "education", "\u{1F4DA}")
        )
      },
      {
        _id: 1,
        title: "Cartoons & Animation",
        type: "kids",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "cartoons", "\u{1F3A8}"))
      },
      {
        _id: 2,
        title: "Family Movies",
        type: "kids",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, "family", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}"))
      }
    ];
    return c.json({
      status: "success",
      result: kidsData.length,
      data: kidsData
    });
  } catch (error) {
    return c.json({
      status: "fail",
      message: "Failed to fetch kids content"
    }, 500);
  }
});
movies.post("/browse/genre/tv_shows", async (c) => {
  return movies.post("/browse/latest", c);
});
movies.post("/browse/genre/movies", async (c) => {
  return movies.post("/browse/made-in-cambodia", c);
});
movies.post("/browse/kids/tv", async (c) => {
  return movies.post("/browse/kids", c);
});
movies.post("/browse/kids/movies", async (c) => {
  return movies.post("/browse/kids", c);
});
var movies_default = movies;

// src/utils/transform.ts
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}
__name(toCamelCase, "toCamelCase");
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
__name(toSnakeCase, "toSnakeCase");
function transformToCamelCase(obj) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => transformToCamelCase(item));
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = transformToCamelCase(value);
    }
    return transformed;
  }
  return obj;
}
__name(transformToCamelCase, "transformToCamelCase");
function transformToSnakeCase(obj) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => transformToSnakeCase(item));
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      transformed[snakeKey] = transformToSnakeCase(value);
    }
    return transformed;
  }
  return obj;
}
__name(transformToSnakeCase, "transformToSnakeCase");
function transformVideoForAPI(dbVideo) {
  if (!dbVideo)
    return null;
  const video = transformToCamelCase(dbVideo);
  if (typeof video.tags === "string") {
    try {
      video.tags = JSON.parse(video.tags);
    } catch {
      video.tags = [];
    }
  }
  if (typeof video.subtitles === "string") {
    try {
      video.subtitles = JSON.parse(video.subtitles);
    } catch {
      video.subtitles = [];
    }
  }
  video.views = Number(video.views) || 0;
  video.likes = Number(video.likes) || 0;
  video.shares = Number(video.shares) || 0;
  video.commentsCount = Number(video.commentsCount) || 0;
  video.duration = video.duration ? Number(video.duration) : void 0;
  video.fileSize = video.fileSize ? Number(video.fileSize) : void 0;
  video.featuredOrder = video.featuredOrder ? Number(video.featuredOrder) : void 0;
  video.featured = Boolean(video.featured);
  return video;
}
__name(transformVideoForAPI, "transformVideoForAPI");

// src/routes/videos.ts
var videos = new Hono2();
videos.get("/featured", async (c) => {
  const env = c.env;
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE featured = 1
      AND status = 'published'
      ORDER BY featured_order ASC, created_at DESC
      LIMIT 5
    `).all();
    let featuredVideos = result.results.map(transformVideoForAPI);
    if (featuredVideos.length === 0) {
      const topResult = await env.DB.prepare(`
        SELECT * FROM videos
        WHERE status = 'published'
        ORDER BY views DESC, likes DESC
        LIMIT 5
      `).all();
      featuredVideos = topResult.results.map(transformVideoForAPI);
    }
    if (featuredVideos.length === 0) {
      featuredVideos = generateMockVideosForSection("featured").slice(0, 5);
    }
    return c.json({
      status: "success",
      data: featuredVideos
    });
  } catch (error) {
    console.error("Featured videos error:", error);
    const mockVideos = generateMockVideosForSection("featured").slice(0, 5);
    return c.json({
      status: "success",
      data: mockVideos
    });
  }
});
videos.get("/section/:sectionKey", async (c) => {
  const sectionKey = c.req.param("sectionKey");
  const env = c.env;
  try {
    let query;
    let params = [];
    switch (sectionKey) {
      case "you_may_like":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY RANDOM()
          LIMIT 18
        `;
        break;
      case "keep_watching":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY views DESC
          LIMIT 18
        `;
        break;
      case "omg":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (tags LIKE '%controversial%' OR tags LIKE '%viral%' OR tags LIKE '%omg%')
          ORDER BY views DESC
          LIMIT 18
        `;
        break;
      case "world_watching":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (category = 'world' OR tags LIKE '%cambodia%' OR tags LIKE '%international%')
          ORDER BY created_at DESC
          LIMIT 18
        `;
        break;
      case "best_hit":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY likes DESC, views DESC
          LIMIT 10
        `;
        break;
      case "comedy":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (category = 'comedy' OR tags LIKE '%comedy%' OR tags LIKE '%funny%')
          ORDER BY created_at DESC
          LIMIT 18
        `;
        break;
      case "originals":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND is_original = 1
          ORDER BY created_at DESC
          LIMIT 18
        `;
        break;
      case "events":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (category = 'events' OR tags LIKE '%event%' OR tags LIKE '%live%')
          ORDER BY created_at DESC
          LIMIT 6
        `;
        break;
      case "community":
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (tags LIKE '%community%' OR category = 'community')
          ORDER BY likes DESC
          LIMIT 18
        `;
        break;
      default:
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY created_at DESC
          LIMIT 18
        `;
    }
    const result = await env.DB.prepare(query).all();
    const sectionVideos = result.results.map(transformVideoForAPI);
    if (sectionVideos.length === 0) {
      const mockVideos = generateMockVideosForSection(sectionKey);
      return c.json({
        status: "success",
        data: mockVideos
      });
    }
    return c.json({
      status: "success",
      data: sectionVideos
    });
  } catch (error) {
    console.error(`Section ${sectionKey} error:`, error);
    const mockVideos = generateMockVideosForSection(sectionKey);
    return c.json({
      status: "success",
      data: mockVideos
    });
  }
});
videos.get("/search", async (c) => {
  const query = c.req.query("q") || "";
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;
  const env = c.env;
  if (!query) {
    return c.json({
      status: "fail",
      message: "Search query is required"
    }, 400);
  }
  try {
    const searchPattern = `%${query}%`;
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM videos
      WHERE status = 'published'
      AND (title LIKE ? OR title_km LIKE ? OR description LIKE ? OR tags LIKE ?)
    `).bind(searchPattern, searchPattern, searchPattern, searchPattern).first();
    const total = countResult?.total || 0;
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE status = 'published'
      AND (title LIKE ? OR title_km LIKE ? OR description LIKE ? OR tags LIKE ?)
      ORDER BY views DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).bind(searchPattern, searchPattern, searchPattern, searchPattern, limit, offset).all();
    const searchResults = result.results.map(transformVideoForAPI);
    return c.json({
      status: "success",
      data: searchResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({
      status: "fail",
      message: "Search failed"
    }, 500);
  }
});
videos.get("/", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;
  const env = c.env;
  try {
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM videos WHERE status = 'published'`
    ).first();
    const total = countResult?.total || 0;
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    const allVideos = result.results.map(transformVideoForAPI);
    return c.json({
      status: "success",
      data: allVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Videos list error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch videos"
    }, 500);
  }
});
videos.get("/:id", async (c) => {
  const id = c.req.param("id");
  const env = c.env;
  try {
    const video = await env.DB.prepare(
      `SELECT * FROM videos WHERE id = ? AND status = 'published'`
    ).bind(id).first();
    if (!video) {
      return c.json({
        status: "fail",
        message: "Video not found"
      }, 404);
    }
    return c.json({
      status: "success",
      data: transformVideoForAPI(video)
    });
  } catch (error) {
    console.error("Video fetch error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch video"
    }, 500);
  }
});
videos.get("/category/:category", async (c) => {
  const category = c.req.param("category");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;
  const env = c.env;
  try {
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM videos WHERE category = ? AND status = 'published'`
    ).bind(category).first();
    const total = countResult?.total || 0;
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE category = ? AND status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(category, limit, offset).all();
    const categoryVideos = result.results.map(transformVideoForAPI);
    return c.json({
      status: "success",
      data: categoryVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Category videos error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch category videos"
    }, 500);
  }
});
function generateMockVideosForSection(sectionKey) {
  const sectionConfigs = {
    featured: { title: "Featured Content", count: 18, badge: "FEATURED" },
    you_may_like: { title: "Recommended for You", count: 18 },
    keep_watching: { title: "Continue Watching", count: 18 },
    omg: { title: "OMG! Viral Videos", count: 18, badge: "OMG!" },
    world_watching: { title: "World is Watching", count: 18 },
    best_hit: { title: "Top Hits", count: 10, badge: "TOP" },
    comedy: { title: "Comedy Special", count: 18 },
    originals: { title: "BAM Original", count: 18, badge: "ORIGINAL" },
    events: { title: "Live Event", count: 6, badge: "LIVE" },
    community: { title: "Community Pick", count: 18 }
  };
  const config = sectionConfigs[sectionKey] || { title: "Video", count: 18 };
  const videos2 = [];
  for (let i = 0; i < config.count; i++) {
    videos2.push({
      id: `mock_${sectionKey}_${i}`,
      title: `${config.title} ${i + 1}`,
      titleKm: `\u179C\u17B8\u178A\u17C1\u17A2\u17BC ${i + 1}`,
      description: `Experience the best of Cambodian content on BAM-flix`,
      thumbnailUrl: `https://picsum.photos/seed/${sectionKey}${i}/640/360`,
      videoUrl: "/sample-video.mp4",
      previewUrl: "/sample-preview.mp4",
      category: sectionKey,
      views: Math.floor(Math.random() * 1e6),
      likes: Math.floor(Math.random() * 1e4),
      duration: Math.floor(Math.random() * 7200),
      badge: config.badge,
      watchProgress: sectionKey === "keep_watching" ? Math.floor(Math.random() * 80) + 20 : 0,
      isOriginal: sectionKey === "originals",
      language: "km",
      ageRating: "pg",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return videos2;
}
__name(generateMockVideosForSection, "generateMockVideosForSection");
var videos_default = videos;

// src/routes/admin.ts
var admin = new Hono2();
async function requireAdmin(c, next) {
  const token = getCookie(c, "admin_jwt");
  if (!token) {
    return c.json({
      status: "fail",
      message: "Admin authentication required"
    }, 401);
  }
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload || !payload.isAdmin) {
    return c.json({
      status: "fail",
      message: "Invalid admin credentials"
    }, 401);
  }
  const admin2 = await c.env.DB.prepare("SELECT id, email, role, is_active FROM admins WHERE id = ?").bind(payload.id).first();
  if (!admin2 || !admin2.is_active) {
    return c.json({
      status: "fail",
      message: "Admin account not found or inactive"
    }, 401);
  }
  c.set("adminId", payload.id);
  c.set("adminEmail", payload.email);
  c.set("adminRole", admin2.role);
  await next();
}
__name(requireAdmin, "requireAdmin");
admin.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const db = c.env.DB;
  try {
    const admin2 = await db.prepare("SELECT id, email, password_hash, name, role FROM admins WHERE email = ? AND is_active = 1").bind(email).first();
    if (!admin2) {
      return c.json({
        status: "fail",
        message: "Invalid credentials"
      }, 401);
    }
    const isValid = await verifyPassword(password, admin2.password_hash);
    if (!isValid) {
      return c.json({
        status: "fail",
        message: "Invalid credentials"
      }, 401);
    }
    await db.prepare("UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?").bind(admin2.id).run();
    const token = await createToken(admin2.id, admin2.email, c.env.JWT_SECRET, { isAdmin: true, role: admin2.role });
    setCookie(c, "admin_jwt", token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60,
      // 8 hours for admin sessions
      sameSite: "None",
      secure: true
    });
    await db.prepare("INSERT INTO admin_logs (admin_id, action, ip_address) VALUES (?, ?, ?)").bind(admin2.id, "login", c.req.header("CF-Connecting-IP") || "unknown").run();
    return c.json({
      status: "success",
      data: {
        id: admin2.id,
        email: admin2.email,
        name: admin2.name,
        role: admin2.role
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return c.json({
      status: "fail",
      message: "Login failed"
    }, 500);
  }
});
admin.post("/logout", requireAdmin, async (c) => {
  const adminId = c.get("adminId");
  await c.env.DB.prepare("INSERT INTO admin_logs (admin_id, action) VALUES (?, ?)").bind(adminId, "logout").run();
  setCookie(c, "admin_jwt", "", {
    httpOnly: true,
    maxAge: 1,
    sameSite: "None",
    secure: true
  });
  return c.json({
    status: "success",
    message: "Logged out successfully"
  });
});
admin.get("/dashboard/stats", requireAdmin, async (c) => {
  const db = c.env.DB;
  try {
    const totalVideos = await db.prepare("SELECT COUNT(*) as count FROM videos").first();
    const totalViews = await db.prepare("SELECT SUM(views) as total FROM videos").first();
    const totalUsers = await db.prepare("SELECT COUNT(*) as count FROM users").first();
    const activeEvents = await db.prepare("SELECT COUNT(*) as count FROM events WHERE status IN (?, ?)").bind("upcoming", "live").first();
    const todayViews = await db.prepare("SELECT COALESCE(SUM(views), 0) as total FROM video_analytics WHERE date = ?").bind((/* @__PURE__ */ new Date()).toISOString().split("T")[0]).first();
    const weekAgo = /* @__PURE__ */ new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyViews = await db.prepare("SELECT COALESCE(SUM(views), 0) as total FROM video_analytics WHERE date >= ?").bind(weekAgo.toISOString().split("T")[0]).first();
    const weeklyGrowth = weeklyViews?.total > 0 ? 12.5 : 0;
    const monthlyGrowth = 25.3;
    const totalWatchTime = (totalVideos?.count || 0) * 1200;
    return c.json({
      status: "success",
      data: {
        totalVideos: totalVideos?.count || 0,
        totalViews: totalViews?.total || 0,
        totalUsers: totalUsers?.count || 0,
        totalWatchTime,
        activeEvents: activeEvents?.count || 0,
        todayViews: todayViews?.total || 0,
        weeklyGrowth,
        monthlyGrowth
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch dashboard statistics"
    }, 500);
  }
});
admin.get("/videos", requireAdmin, async (c) => {
  const db = c.env.DB;
  const { category, status, featured, page = 1, limit = 20 } = c.req.query();
  try {
    let query = "SELECT v.*, a.name as uploaded_by_name FROM videos v LEFT JOIN admins a ON v.uploaded_by = a.id WHERE 1=1";
    const params = [];
    if (category) {
      query += " AND v.category = ?";
      params.push(category);
    }
    if (status) {
      query += " AND v.status = ?";
      params.push(status);
    }
    if (featured !== void 0) {
      query += " AND v.featured = ?";
      params.push(featured === "true" ? 1 : 0);
    }
    query += " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, (page - 1) * limit);
    const videos2 = await db.prepare(query).bind(...params).all();
    let countQuery = "SELECT COUNT(*) as total FROM videos WHERE 1=1";
    const countParams = [];
    if (category) {
      countQuery += " AND category = ?";
      countParams.push(category);
    }
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }
    if (featured !== void 0) {
      countQuery += " AND featured = ?";
      countParams.push(featured === "true" ? 1 : 0);
    }
    const count = await db.prepare(countQuery).bind(...countParams).first();
    const transformedVideos = videos2.results ? videos2.results.map(transformVideoForAPI) : [];
    return c.json({
      status: "success",
      data: transformedVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count.total,
        pages: Math.ceil(count.total / limit)
      }
    });
  } catch (error) {
    console.error("Get videos error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch videos"
    }, 500);
  }
});
admin.post("/videos", requireAdmin, async (c) => {
  const adminId = c.get("adminId");
  const db = c.env.DB;
  try {
    const data = await c.req.json();
    const videoId = generateId();
    if (!data.title || !data.category) {
      return c.json({
        status: "fail",
        message: "Title and category are required"
      }, 400);
    }
    await db.prepare(`
        INSERT INTO videos (
          id, title, title_km, description, description_km,
          thumbnail_url, preview_url, video_url, r2_key,
          category, subcategory, section, duration,
          badge, tags, language, status, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      videoId,
      data.title,
      data.title_km || null,
      data.description || null,
      data.description_km || null,
      data.thumbnail_url || null,
      data.preview_url || null,
      data.video_url || null,
      data.r2_key || null,
      data.category,
      data.subcategory || null,
      data.section || null,
      data.duration || 0,
      data.badge || null,
      JSON.stringify(data.tags || []),
      data.language || "km",
      "draft",
      adminId
    ).run();
    await db.prepare("INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)").bind(adminId, "create", "video", videoId, JSON.stringify({ title: data.title })).run();
    return c.json({
      status: "success",
      data: {
        id: videoId,
        message: "Video created successfully"
      }
    }, 201);
  } catch (error) {
    console.error("Create video error:", error);
    return c.json({
      status: "fail",
      message: "Failed to create video"
    }, 500);
  }
});
admin.put("/videos/:id", requireAdmin, async (c) => {
  const videoId = c.req.param("id");
  const adminId = c.get("adminId");
  const db = c.env.DB;
  try {
    const data = await c.req.json();
    const updates = [];
    const params = [];
    const allowedFields = [
      "title",
      "title_km",
      "description",
      "description_km",
      "thumbnail_url",
      "preview_url",
      "video_url",
      "r2_key",
      "category",
      "subcategory",
      "section",
      "duration",
      "badge",
      "tags",
      "language",
      "status",
      "featured",
      "featured_order",
      "age_rating"
    ];
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updates.push(`${field} = ?`);
        params.push(field === "tags" ? JSON.stringify(data[field]) : data[field]);
      }
    }
    if (updates.length === 0) {
      return c.json({
        status: "fail",
        message: "No fields to update"
      }, 400);
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(videoId);
    await db.prepare(`UPDATE videos SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    await db.prepare("INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)").bind(adminId, "update", "video", videoId, JSON.stringify(data)).run();
    return c.json({
      status: "success",
      message: "Video updated successfully"
    });
  } catch (error) {
    console.error("Update video error:", error);
    return c.json({
      status: "fail",
      message: "Failed to update video"
    }, 500);
  }
});
admin.post("/videos/:id/publish", requireAdmin, async (c) => {
  const videoId = c.req.param("id");
  const adminId = c.get("adminId");
  const db = c.env.DB;
  try {
    const video = await db.prepare("SELECT id, title, video_url, thumbnail_url FROM videos WHERE id = ?").bind(videoId).first();
    if (!video) {
      return c.json({
        status: "fail",
        message: "Video not found"
      }, 404);
    }
    if (!video.video_url || !video.thumbnail_url) {
      return c.json({
        status: "fail",
        message: "Video must have video URL and thumbnail before publishing"
      }, 400);
    }
    await db.prepare("UPDATE videos SET status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?").bind("published", videoId).run();
    await c.env.CACHE.delete("browse:KH");
    await db.prepare("INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)").bind(adminId, "publish", "video", videoId, JSON.stringify({ title: video.title })).run();
    return c.json({
      status: "success",
      message: "Video published successfully"
    });
  } catch (error) {
    console.error("Publish video error:", error);
    return c.json({
      status: "fail",
      message: "Failed to publish video"
    }, 500);
  }
});
admin.delete("/videos/:id", requireAdmin, async (c) => {
  const videoId = c.req.param("id");
  const adminId = c.get("adminId");
  const adminRole = c.get("adminRole");
  const db = c.env.DB;
  if (!["admin", "super_admin"].includes(adminRole)) {
    return c.json({
      status: "fail",
      message: "Insufficient permissions"
    }, 403);
  }
  try {
    const video = await db.prepare("SELECT title, r2_key FROM videos WHERE id = ?").bind(videoId).first();
    if (!video) {
      return c.json({
        status: "fail",
        message: "Video not found"
      }, 404);
    }
    await db.prepare("DELETE FROM videos WHERE id = ?").bind(videoId).run();
    await c.env.CACHE.delete("browse:KH");
    await db.prepare("INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)").bind(adminId, "delete", "video", videoId, JSON.stringify({ title: video.title })).run();
    return c.json({
      status: "success",
      message: "Video deleted successfully"
    });
  } catch (error) {
    console.error("Delete video error:", error);
    return c.json({
      status: "fail",
      message: "Failed to delete video"
    }, 500);
  }
});
admin.post("/upload/request", requireAdmin, async (c) => {
  const { filename, contentType, fileSize } = await c.req.json();
  const adminId = c.get("adminId");
  const maxSize = 5 * 1024 * 1024 * 1024;
  if (fileSize > maxSize) {
    return c.json({
      status: "fail",
      message: "File size exceeds 5GB limit"
    }, 400);
  }
  const timestamp = Date.now();
  const r2Key = `videos/${timestamp}-${filename}`;
  return c.json({
    status: "success",
    data: {
      r2Key,
      uploadUrl: "https://r2-upload-url-placeholder.com",
      // Placeholder
      message: "R2 upload configuration needed"
    }
  });
});
admin.post("/videos/upload", requireAdmin, async (c) => {
  const adminId = c.get("adminId");
  const db = c.env.DB;
  try {
    const formData = await c.req.formData();
    console.log("Upload form data received");
    const formFields = {};
    for (const [key, value] of formData.entries()) {
      if (key !== "video" && key !== "thumbnail") {
        formFields[key] = value.toString();
      }
    }
    console.log("Extracted form fields:", formFields);
    const videoData = transformToSnakeCase(formFields);
    videoData.language = videoData.language || "km";
    videoData.age_rating = videoData.age_rating || "all";
    videoData.status = videoData.status || "draft";
    if (!videoData.title || !videoData.category) {
      console.log("Validation failed - missing required fields:", {
        title: videoData.title,
        category: videoData.category,
        allFields: videoData
      });
      return c.json({
        status: "fail",
        message: `Title and category are required. Received: title=${videoData.title}, category=${videoData.category}`
      }, 400);
    }
    const videoId = generateId();
    const mockVideoUrl = `https://r2-bucket.com/videos/${videoId}.mp4`;
    const mockThumbnailUrl = `https://r2-bucket.com/thumbnails/${videoId}.jpg`;
    const dbRecord = {
      id: videoId,
      title: videoData.title,
      title_km: videoData.title_km || null,
      description: videoData.description || null,
      description_km: videoData.description_km || null,
      thumbnail_url: mockThumbnailUrl,
      video_url: mockVideoUrl,
      category: videoData.category,
      subcategory: videoData.subcategory || null,
      section: videoData.section || null,
      language: videoData.language,
      age_rating: videoData.age_rating,
      badge: videoData.badge || null,
      tags: videoData.tags ? JSON.stringify(Array.isArray(videoData.tags) ? videoData.tags : videoData.tags.split(",").map((t) => t.trim())) : null,
      status: videoData.status,
      uploaded_by: adminId,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      scheduled_at: videoData.scheduled_at || null
    };
    await db.prepare(`
        INSERT INTO videos (
          id, title, title_km, description, description_km,
          thumbnail_url, video_url, category, subcategory, section,
          language, age_rating, badge, tags, status, uploaded_by,
          created_at, updated_at, scheduled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      dbRecord.id,
      dbRecord.title,
      dbRecord.title_km,
      dbRecord.description,
      dbRecord.description_km,
      dbRecord.thumbnail_url,
      dbRecord.video_url,
      dbRecord.category,
      dbRecord.subcategory,
      dbRecord.section,
      dbRecord.language,
      dbRecord.age_rating,
      dbRecord.badge,
      dbRecord.tags,
      dbRecord.status,
      dbRecord.uploaded_by,
      dbRecord.created_at,
      dbRecord.updated_at,
      dbRecord.scheduled_at
    ).run();
    await db.prepare("INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)").bind(adminId, "video_upload", "video", videoId, JSON.stringify({ title: dbRecord.title, category: dbRecord.category, status: dbRecord.status })).run();
    const responseData = transformVideoForAPI(dbRecord);
    return c.json({
      status: "success",
      message: "Video uploaded successfully (mock implementation)",
      data: {
        ...responseData,
        note: "This is a mock implementation. Real file upload and R2 storage integration needed."
      }
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return c.json({
      status: "fail",
      message: `Failed to upload video: ${error.message}`
    }, 500);
  }
});
admin.get("/analytics", requireAdmin, async (c) => {
  const db = c.env.DB;
  const { period = "7" } = c.req.query();
  try {
    const stats = await db.prepare(`
        SELECT
          COUNT(DISTINCT v.id) as total_videos,
          COUNT(DISTINCT CASE WHEN v.status = 'published' THEN v.id END) as published_videos,
          SUM(v.views) as total_views,
          COUNT(DISTINCT u.id) as total_users
        FROM videos v
        CROSS JOIN users u
      `).first();
    const recentVideos = await db.prepare(`
        SELECT
          v.id, v.title, v.views, v.likes, v.published_at,
          ROUND(AVG(va.completion_rate), 2) as avg_completion
        FROM videos v
        LEFT JOIN video_analytics va ON v.id = va.video_id
        WHERE v.status = 'published'
          AND v.published_at >= datetime('now', '-${period} days')
        GROUP BY v.id
        ORDER BY v.views DESC
        LIMIT 10
      `).all();
    const categories = await db.prepare(`
        SELECT
          category,
          COUNT(*) as video_count,
          SUM(views) as total_views
        FROM videos
        WHERE status = 'published'
        GROUP BY category
        ORDER BY total_views DESC
      `).all();
    return c.json({
      status: "success",
      data: {
        overview: stats,
        recentVideos: recentVideos.results,
        categoryBreakdown: categories.results,
        period: `${period} days`
      }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return c.json({
      status: "fail",
      message: "Failed to fetch analytics"
    }, 500);
  }
});
admin.post("/featured", requireAdmin, async (c) => {
  const adminId = c.get("adminId");
  const db = c.env.DB;
  const { videoId, sectionKey, displayOrder } = await c.req.json();
  try {
    const video = await db.prepare("SELECT id FROM videos WHERE id = ?").bind(videoId).first();
    if (!video) {
      return c.json({
        status: "fail",
        message: "Video not found"
      }, 404);
    }
    await db.prepare(`
        INSERT OR REPLACE INTO featured_content
        (video_id, section_key, display_order, is_active, created_by)
        VALUES (?, ?, ?, 1, ?)
      `).bind(videoId, sectionKey, displayOrder || 0, adminId).run();
    await c.env.CACHE.delete("browse:KH");
    return c.json({
      status: "success",
      message: "Featured content updated"
    });
  } catch (error) {
    console.error("Featured content error:", error);
    return c.json({
      status: "fail",
      message: "Failed to update featured content"
    }, 500);
  }
});
admin.post("/users", requireAdmin, async (c) => {
  const adminRole = c.get("adminRole");
  const adminId = c.get("adminId");
  const db = c.env.DB;
  if (adminRole !== "super_admin") {
    return c.json({
      status: "fail",
      message: "Only super admins can create admin accounts"
    }, 403);
  }
  try {
    const { email, password, name, role = "editor" } = await c.req.json();
    if (!email || !password || !name) {
      return c.json({
        status: "fail",
        message: "Email, password, and name are required"
      }, 400);
    }
    const existing = await db.prepare("SELECT id FROM admins WHERE email = ?").bind(email).first();
    if (existing) {
      return c.json({
        status: "fail",
        message: "Admin with this email already exists"
      }, 400);
    }
    const passwordHash = await hashPassword(password);
    const newAdminId = generateId();
    await db.prepare("INSERT INTO admins (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)").bind(newAdminId, email, passwordHash, name, role).run();
    await db.prepare("INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)").bind(adminId, "create_admin", "admin", newAdminId, JSON.stringify({ email, name, role })).run();
    return c.json({
      status: "success",
      data: {
        id: newAdminId,
        email,
        name,
        role
      }
    }, 201);
  } catch (error) {
    console.error("Create admin error:", error);
    return c.json({
      status: "fail",
      message: "Failed to create admin"
    }, 500);
  }
});
var admin_default = admin;

// src/index.ts
var app = new Hono2();
var allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://client-chi-flame.vercel.app",
  "https://client-jjh7k4dp0-khopilots-projects.vercel.app",
  "https://client-rh2cxem7k-khopilots-projects.vercel.app",
  "https://client-nuxgubbzy-khopilots-projects.vercel.app",
  "https://bam-admin-hyiv93pp0-khopilots-projects.vercel.app",
  "https://bam-admin-7ar1wq6jo-khopilots-projects.vercel.app",
  "https://bam-admin-oq3orj2tj-khopilots-projects.vercel.app"
];
app.use("*", logger());
app.use("*", cors({
  origin: (origin, c) => {
    if (!origin)
      return null;
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    if (origin.includes(".vercel.app")) {
      return origin;
    }
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposeHeaders: ["set-cookie"]
}));
var api = app.basePath("/api/v1/bamflix");
api.route("/users", auth_default);
api.route("/users", users_default);
api.route("/users", profiles_default);
api.route("/", movies_default);
api.route("/videos", videos_default);
api.route("/admin", admin_default);
api.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "bamflix-workers",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.notFound((c) => {
  return c.json({
    status: "fail",
    message: "Route not found"
  }, 404);
});
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({
    status: "error",
    message: err.message || "Internal server error"
  }, 500);
});
var src_default = app;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-CPF2Jk/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-CPF2Jk/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
