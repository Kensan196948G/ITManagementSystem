import { MongoClient } from 'mongodb';
import Redis from 'ioredis';

async function testConnections() {
  // MongoDB接続テスト
  try {
    const mongoClient = await MongoClient.connect('mongodb://localhost:27017');
    console.log('MongoDB connection successful');
    await mongoClient.close();
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }

  // Redis接続テスト
  try {
    const redis = new Redis({
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
  } catch (error) {
    console.error('Redis initialization failed:', error);
  }
}

testConnections();