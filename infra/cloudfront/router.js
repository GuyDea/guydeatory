// CloudFront Function (runtime cloudfront-js-2.0), viewer request.
// The four settings below are filled in by infra/render.ts from src/i18n/languages.ts.
// Plain ES5 on purpose. Tested in tests/router.test.ts.
var LANGS = __LANGS__;
var DEFAULT_LANG = __DEFAULT_LANG__;
var ALIASES = __ALIASES__;
var APEX = __APEX__;

function redirect(status, location) {
  return {
    statusCode: status,
    statusDescription: status === 301 ? 'Moved Permanently' : 'Found',
    headers: {
      location: { value: location },
      'cache-control': { value: status === 301 ? 'public, max-age=3600' : 'no-store' },
    },
  };
}

// CloudFront hands us keys and values still URL-encoded, so they are passed through unchanged.
function queryString(querystring) {
  var parts = [];
  for (var key in querystring) {
    var entry = querystring[key];
    var values = entry.multiValue ? entry.multiValue : [entry];
    for (var i = 0; i < values.length; i++) {
      parts.push(key + (values[i].value === '' ? '' : '=' + values[i].value));
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

function supported(tag) {
  var primary = tag.split('-')[0];
  if (LANGS.indexOf(primary) !== -1) return primary;
  return ALIASES[primary] || null;
}

// The reader's saved choice (lang cookie), else the best Accept-Language match, else the default.
function pickLanguage(request) {
  var cookie = request.cookies && request.cookies.lang;
  if (cookie && LANGS.indexOf(cookie.value) !== -1) return cookie.value;
  var header = request.headers['accept-language'];
  if (!header) return DEFAULT_LANG;
  var entries = [];
  var items = header.value.split(',');
  for (var i = 0; i < items.length; i++) {
    var pieces = items[i].split(';');
    var tag = pieces[0].trim().toLowerCase();
    var q = 1;
    for (var j = 1; j < pieces.length; j++) {
      var param = pieces[j].trim();
      if (param.indexOf('q=') === 0) q = parseFloat(param.slice(2));
    }
    if (tag && !isNaN(q) && q > 0) entries.push({ tag: tag, q: q, index: i });
  }
  entries.sort(function (a, b) {
    return b.q - a.q || a.index - b.index;
  });
  for (var k = 0; k < entries.length; k++) {
    var lang = supported(entries[k].tag);
    if (lang) return lang;
  }
  return DEFAULT_LANG;
}

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var uri = request.uri;
  var query = queryString(request.querystring || {});

  if (host !== APEX && host.indexOf('www.') === 0) {
    return redirect(301, 'https://' + APEX + uri + query);
  }
  // "//evil.com/x" or "/\\evil.com" would read as another host in a relative Location header:
  // normalise such paths and always redirect to an absolute URL on our own domain.
  if (uri.indexOf('//') === 0 || uri.indexOf('\\') !== -1) {
    return redirect(301, 'https://' + APEX + uri.replace(/\\/g, '/').replace(/^\/+/, '/') + query);
  }
  if (uri === '/') {
    return redirect(302, '/' + pickLanguage(request) + '/' + query);
  }
  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }
  var last = uri.substring(uri.lastIndexOf('/') + 1);
  if (last.indexOf('.') === -1) {
    return redirect(301, 'https://' + APEX + uri + '/' + query);
  }
  return request;
}
