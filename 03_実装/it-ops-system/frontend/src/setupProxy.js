const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API リクエストのプロキシ設定
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '' // /api プレフィックスを削除
      },
      onProxyReq: function(proxyReq, req, res) {
        proxyReq.setHeader('x-forwarded-host', 'localhost:3000');
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ 
          status: 'error',
          message: 'Could not connect to the backend server'
        }));
      }
    })
  );

  // Auth リクエストのプロキシ設定（開発モード用）
  app.use(
    '/auth',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      secure: false,
      onProxyReq: function(proxyReq, req, res) {
        proxyReq.setHeader('x-forwarded-host', 'localhost:3000');
      },
      onError: function(err, req, res) {
        console.error('Auth proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ 
          status: 'error',
          message: 'Could not connect to the backend server'
        }));
      }
    })
  );

  // WebSocket 接続のプロキシ設定
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      ws: true, // WebSocketサポートを有効化
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onError: function(err, req, res) {
        console.error('WebSocket proxy error:', err);
      }
    })
  );
};
