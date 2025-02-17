"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_1 = require("../setup");
const index_1 = __importDefault(require("../../index"));
const activedirectory2_1 = __importDefault(require("activedirectory2"));
// ActiveDirectoryのモック
jest.mock('activedirectory2');
describe('AD Routes', () => {
    let testToken;
    beforeEach(() => {
        testToken = (0, setup_1.createTestToken)({ id: 'test-user-id', roles: ['admin'] });
        jest.clearAllMocks();
    });
    describe('GET /ad/users', () => {
        const mockUsers = [
            {
                sAMAccountName: 'testuser1',
                displayName: 'Test User 1',
                mail: 'testuser1@example.com',
                department: 'IT',
            },
            {
                sAMAccountName: 'testuser2',
                displayName: 'Test User 2',
                mail: 'testuser2@example.com',
                department: 'HR',
            },
        ];
        it('ユーザー一覧の取得 - 成功', async () => {
            activedirectory2_1.default.mockImplementation(() => ({
                findUsers: (_query, callback) => callback(null, mockUsers),
            }));
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/ad/users')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body.data).toEqual(mockUsers);
        });
        it('ユーザー一覧の取得 - AD接続エラー', async () => {
            activedirectory2_1.default.mockImplementation(() => ({
                findUsers: (_query, callback) => callback(new Error('AD connection failed')),
            }));
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/ad/users')
                .set('Authorization', `Bearer ${testToken}`);
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body).toHaveProperty('code', 'AD_ERROR');
        });
        it('認証なしでのアクセス拒否', async () => {
            const response = await (0, supertest_1.default)(index_1.default).get('/api/ad/users');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body).toHaveProperty('message', 'No token provided');
        });
    });
    describe('POST /ad/users', () => {
        const mockUserData = {
            sAMAccountName: 'newuser',
            displayName: 'New User',
            mail: 'newuser@example.com',
            department: 'IT',
        };
        it('ユーザー作成 - 成功', async () => {
            activedirectory2_1.default.mockImplementation(() => ({
                createUser: (_userData, callback) => callback(null),
            }));
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/ad/users')
                .set('Authorization', `Bearer ${testToken}`)
                .send(mockUserData);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'User created successfully');
        });
        it('ユーザー作成 - バリデーションエラー', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/ad/users')
                .set('Authorization', `Bearer ${testToken}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('status', 'error');
        });
    });
    describe('PUT /ad/users/:samAccountName', () => {
        const mockUpdateData = {
            displayName: 'Updated User',
            department: 'Finance',
        };
        it('ユーザー更新 - 成功', async () => {
            activedirectory2_1.default.mockImplementation(() => ({
                updateUser: (_samAccountName, _userData, callback) => callback(null),
            }));
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/ad/users/testuser')
                .set('Authorization', `Bearer ${testToken}`)
                .send(mockUpdateData);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'User updated successfully');
        });
    });
    describe('POST /ad/groups', () => {
        const mockGroupData = {
            cn: 'IT-Group',
            description: 'IT Department Group',
        };
        it('グループ作成 - 成功', async () => {
            activedirectory2_1.default.mockImplementation(() => ({
                createGroup: (_groupData, callback) => callback(null),
            }));
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/ad/groups')
                .set('Authorization', `Bearer ${testToken}`)
                .send(mockGroupData);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Group created successfully');
        });
    });
    describe('POST /ad/groups/:name/members', () => {
        it('グループメンバー追加 - 成功', async () => {
            activedirectory2_1.default.mockImplementation(() => ({
                addUsersToGroup: (_groupName, _members, callback) => callback(null),
            }));
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/ad/groups/IT-Group/members')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                action: 'add',
                members: ['user1', 'user2'],
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Members added to group successfully');
        });
    });
});
//# sourceMappingURL=ad.test.js.map