var express = require('express');
var cookieParser = require('cookie-parser');

var POSTS = {
  '1': {'post': 'This is the first blog post.'},
  '2': {'post': 'This is the second blog post.'},
  '3': {'post': 'This is the third blog post.'}
};

var isPreflight = function(req) {
  var isHttpOptions = req.method === 'OPTIONS';
  var hasOriginHeader = req.headers['origin'];
  var hasRequestMethod = req.headers['access-control-request-method'];
  return isHttpOptions && hasOriginHeader && hasRequestMethod;
};

var createWhitelistValidator = function(whitelist) {
  return function(val) {
    for (var i = 0; i < whitelist.length; i++) {
      if (val == whitelist[i]) {
        return true;
      }
    }
    return false;
  }
};

var originWhitelist = [
  'null',
  'http://localhost:1111'
];

var corsOptions = {
  allowOrigin: createWhitelistValidator(originWhitelist),
  allowCredentials: true,
  shortCircuit: true,
  allowMethods: ['GET', 'DELETE'],
  allowHeaders: function(req) {
    var reqHeaders = req.headers['access-control-request-headers'];
    if (!reqHeaders) {
      return null;
    }
    reqHeaders = reqHeaders.split(',');
    resHeaders = [];
    for (var i = 0; i < reqHeaders.length; i++) {
      var header = reqHeaders[i].trim();
      if (header.toLowerCase().indexOf('x-') === 0) {
        resHeaders.push(header);
      }
    }
    return resHeaders.join(',');
  }
};

var handleCors = function(options) {
  return function(req, res, next) {

    if (options.allowOrigin) {
      var origin = req.headers['origin'];
      if (options.allowOrigin(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
      } else if (options.shortCircuit) {
        res.send(403);
        return;
      }
      res.set('Vary', 'Origin');
    } else {
      res.set('Access-Control-Allow-Origin', '*');
    }

    if (options.allowCredentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    if (isPreflight(req)) {
      if (options.allowMethods) {
        res.set('Access-Control-Allow-Methods',
            options.allowMethods.join(','));
      }
      if (typeof(options.allowHeaders) === 'function') {
        var headers = options.allowHeaders(req);
        if (headers) {
          res.set('Access-Control-Allow-Headers', headers);
        }
      } else if (options.allowHeaders) {
        res.set('Access-Control-Allow-Headers',
            options.allowHeaders.join(','));
      }
      res.set('Access-Control-Max-Age', '120');
      res.send(204);
      return;
    } else {
      res.set('Access-Control-Expose-Headers', 'X-Powered-By');
    }
    next();
  }
};

var SERVER_PORT = 9999;
var serverapp = express();
serverapp.use(cookieParser());
serverapp.use(express.static(__dirname));
serverapp.use(handleCors(corsOptions));
serverapp.get('/api/posts', function(req, res) {
  res.json(POSTS);
});
serverapp.delete('/api/posts/:id', function(req, res) {
  if (req.cookies['username'] === 'owner') {
    delete POSTS[req.params.id];
    res.send(204);
  } else {
    res.send(403);
  }
});
serverapp.listen(SERVER_PORT, function() {
  console.log('Started server at http://localhost:' + SERVER_PORT);
});

var CLIENT_PORT = 1111;
var clientapp = express();
clientapp.use(express.static(__dirname));
clientapp.listen(CLIENT_PORT, function() {
  console.log('Started client at http://localhost:' + CLIENT_PORT);
});
