'use strict';

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;

// SQLite database interaction logic
var better_sqlite3_1 = require("better-sqlite3");
var path_1 = require("path");
var fs_1 = require("fs");

// Initialize database connection
var DB_PATH = process.env.DB_PATH || path_1.default.join(process.cwd(), 'data', 'collabflow.db');

// Ensure the data directory exists
var dataDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
    console.log("Created data directory at ".concat(dataDir));
}

var db;
try {
    // Use type assertion to avoid constructor type issues
    exports.db = db = new better_sqlite3_1.default(DB_PATH);
    console.log("SQLite database connected at ".concat(DB_PATH));
}
catch (error) {
    console.error('Failed to connect to SQLite database:', error);
    throw error;
}

// Initialize database schema if needed
var initializeSchema = function () { return __awaiter(void 0, void 0, void 0, function () {
    var userTableExists, _a, usersTable, userEmailsTable, authTokensTable, linksTable, userActivityTable, userUpdateTrigger, initializeMigrations, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
                if (!userTableExists) {
                    console.log('Creating initial database schema...');
                    _a = require('./schema'), usersTable = _a.usersTable, userEmailsTable = _a.userEmailsTable, authTokensTable = _a.authTokensTable, linksTable = _a.linksTable, userActivityTable = _a.userActivityTable, userUpdateTrigger = _a.userUpdateTrigger;
                    // Execute initial schema creation
                    db.exec(usersTable);
                    db.exec(userEmailsTable);
                    db.exec(authTokensTable);
                    db.exec(linksTable);
                    db.exec(userActivityTable);
                    db.exec(userUpdateTrigger);
                    console.log('Base database schema initialized');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/runner'); })];
            case 2:
                initializeMigrations = (_b.sent()).initializeMigrations;
                return [4 /*yield*/, initializeMigrations()];
            case 3:
                _b.sent();
                console.log('Database migrations applied successfully');
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                console.error('Error running migrations:', error_1);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };

// Run initialization as an immediately invoked function expression
(function() {
    initializeSchema().catch(function(err) {
        console.error('Database initialization failed:', err);
    });
})();

console.log("Database module loaded");
