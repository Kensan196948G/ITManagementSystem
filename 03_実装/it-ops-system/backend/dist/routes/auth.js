"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const activedirectory2_1 = __importDefault(require("activedirectory2"));
const dotenv_1 = require("dotenv");
// 環境変数の読み込み
(0, dotenv_1.config)();
const router = express_1.default.Router();
// ADの設定
const adConfig = {
    url: process.env.AD_URL,
    baseDN: process.env.AD_BASE_DN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD
};
const ad = new activedirectory2_1.default(adConfig);
// JWTトークン生成関数
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        username: user.username,
        roles: user.roles
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};
// AD認証とJWTトークン生成
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username and password are required'
            });
        }
        // AD認証
        return new Promise((resolve) => {
            ad.authenticate(username, password, async (err, auth) => {
                if (err) {
                    console.error('AD Authentication error:', err);
                    res.status(401).json({
                        status: 'error',
                        message: 'Authentication failed'
                    });
                    return resolve();
                }
                if (!auth) {
                    res.status(401).json({
                        status: 'error',
                        message: 'Invalid credentials'
                    });
                    return resolve();
                }
                // ユーザー情報の取得
                ad.findUser(username, (findErr, user) => {
                    if (findErr) {
                        console.error('Error finding user:', findErr);
                        res.status(500).json({
                            status: 'error',
                            message: 'Error retrieving user information'
                        });
                        return resolve();
                    }
                    if (!user) {
                        res.status(404).json({
                            status: 'error',
                            message: 'User not found'
                        });
                        return resolve();
                    }
                    // JWTトークンの生成
                    const token = generateToken(user);
                    // レスポンス
                    res.json({
                        status: 'success',
                        data: {
                            token,
                            user: {
                                username: user.sAMAccountName,
                                displayName: user.displayName,
                                email: user.mail,
                                groups: user.memberOf
                            }
                        }
                    });
                    resolve();
                });
            });
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
// トークン検証ミドルウェア
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({
            status: 'error',
            message: 'No token provided'
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({
            status: 'error',
            message: 'Invalid token'
        });
        return;
    }
};
exports.verifyToken = verifyToken;
// ユーザー情報取得
router.get('/me', exports.verifyToken, (req, res) => {
    res.json({
        status: 'success',
        data: {
            user: req.user
        }
    });
});
// ログアウト
router.post('/logout', exports.verifyToken, (req, res) => {
    res.json({
        status: 'success',
        message: 'Logged out successfully'
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map