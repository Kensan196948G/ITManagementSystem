"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertSeverity = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
    NotificationType["CRITICAL"] = "critical";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "low";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
//# sourceMappingURL=notifications.js.map