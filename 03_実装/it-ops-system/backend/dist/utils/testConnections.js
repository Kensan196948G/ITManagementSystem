"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const ioredis_1 = __importDefault(require("ioredis"));
async function testConnections() {
    // MongoDB接続テスト
    try {
        const mongoClient = await mongodb_1.MongoClient.connect('mongodb://localhost:27017');
        console.log('MongoDB connection successful');
        await mongoClient.close();
    }
    catch (error) {
        console.error('MongoDB connection failed:', error);
    }
    // Redis接続テスト
    try {
        const redis = new ioredis_1.default({
            host: 'localhost',
            port: 6379
        });
        redis.on('connect', () => {
            console.log('Redis connection successful');
            redis.quit();
        });
        redis.on('error', (error) => {
            console.error('Redis connection failed:', error);
        });
    }
    catch (error) {
        console.error('Redis initialization failed:', error);
    }
}
testConnections();
//# sourceMappingURL=testConnections.js.map