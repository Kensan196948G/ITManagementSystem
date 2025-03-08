"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationLevel = void 0;
/**
 * 権限レベルの列挙型 - フロントエンドの AuthorizationLevel と一致させる
 */
var AuthorizationLevel;
(function (AuthorizationLevel) {
    // グローバル管理者のみがアクセス可能
    AuthorizationLevel["GLOBAL_ADMIN_ONLY"] = "GLOBAL_ADMIN_ONLY";
    // 特定の管理者ロールを持つユーザーがアクセス可能
    AuthorizationLevel["ADMIN_ROLE"] = "ADMIN_ROLE";
    // 一般ユーザー（適切なロールを持つ）がアクセス可能
    AuthorizationLevel["USER_ROLE"] = "USER_ROLE";
    // すべての認証済みユーザーがアクセス可能
    AuthorizationLevel["AUTHENTICATED"] = "AUTHENTICATED";
})(AuthorizationLevel || (exports.AuthorizationLevel = AuthorizationLevel = {}));
//# sourceMappingURL=authorization.js.map