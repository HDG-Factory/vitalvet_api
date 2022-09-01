import { sequelize } from '../database/connectdb.js';
import { server } from "../index.js";
import { User } from "../models/User.js";
import { api, expectSuccessfulCreation, expectBadRequestResponse, expectSuccessfulRequestResponse, expectNotFoundResponse, expectIncompleteRequiredBody, expectUnauthorizedResponse, expectTokenErrorMessageReceived, initialUsers, apiPost, expectLengthOfDatabaseInstancesToBeTheSameWith, expectBadRequiredBodyAttribute, apiLoginUser, apiDeleteWithAuth, apiDelete, apiLoginTestUser, after1s, expectTokenExpiredErrorMessageReceived, ensureOnlyInitialInstancesExist, expectOnlyInitialInstancesInDatabase, compareUserFunc } from "./testCommon.js";

describe('user enpoints', () => {
    beforeEach(async () => {
        await ensureOnlyInitialInstancesExist(User, initialUsers, compareUserFunc);
    });

    describe('test scenary ready', () => {
        test('expected initial users', async () => {
            expectOnlyInitialInstancesInDatabase(User, initialUsers, compareUserFunc);
        });
    });

    describe('register a new user', () => {
        const endpointUrl = '/auth/register';

        test('user created successfully', async () => {
            const newUser = { email: "newemail@example.com", password: "newPassword#123" };
            const createResponse = await apiPost(endpointUrl, newUser);
            expectSuccessfulCreation(createResponse);
            expect(createResponse.body.expiresIn).toBe(900);
            expect(createResponse.body.accessToken.length).toBeGreaterThan(0);
            expect(createResponse.body.refreshToken.length).toBeGreaterThan(0);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length + 1);
        });

        test('failed to create user because there is already another user with the same email', async () => {
            const createResponse = await apiPost(endpointUrl, initialUsers[1]);
            expectBadRequestResponse(createResponse);
            const expectedBody = { message: 'User already exists with this email' };
            expect(createResponse.body).toEqual(expectedBody);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });

        test('failed to create user because the email is not valid', async () => {
            const newUser = { email: "newemailexample.com", password: "newPassword#123" };
            const createResponse = await apiPost(endpointUrl, newUser);
            expectBadRequestResponse(createResponse);
            expectBadRequiredBodyAttribute(createResponse, "Email must be valid");
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });

        test('failed to create user because because the password is less than 6 characters', async () => {
            const newUser = { email: "newemail@example.com", password: "newPa" };
            const createResponse = await apiPost(endpointUrl, newUser);
            expectBadRequestResponse(createResponse);
            expectBadRequiredBodyAttribute(createResponse, "Password must be at least 6 characters");
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });

        test('failed to create the user because there is no email and password', async () => {
            const createResponse = await apiPost(endpointUrl, {});
            expectBadRequestResponse(createResponse);
            expectBadRequiredBodyAttribute(createResponse, "Email is required");
            expectBadRequiredBodyAttribute(createResponse, "Password is required");
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });
    });

    describe('login a user', () => {
        const endpointUrl = '/auth/login';

        test('user logged in successfully', async () => {
            const createResponse = await apiPost(endpointUrl, initialUsers[1]);
            expectSuccessfulRequestResponse(createResponse);            
            expect(createResponse.body.expiresIn).toBe(900);
            expect(createResponse.body.accessToken.length).toBeGreaterThan(0);
            expect(createResponse.body.refreshToken.length).toBeGreaterThan(0);
        });

        test('failed to login the user because there is no user with the email', async () => {
            const user = { email: "newemail@example.com", password: initialUsers[1].password };
            const createResponse = await apiPost(endpointUrl, user);
            expectNotFoundResponse(createResponse);
            const expectedBody = { message: 'Invalid email or password' };
            expect(createResponse.body).toEqual(expectedBody);
        });

        test('failed to login the user because the password is incorrect', async () => {
            const user = { email: initialUsers[1].email, password: "newPassword#123" };
            const createResponse = await apiPost(endpointUrl, user);
            expectNotFoundResponse(createResponse);
            const expectedBody = { message: 'Invalid email or password' };
            expect(createResponse.body).toEqual(expectedBody);
        });

        test('failed to login the user because there is no email and password', async () => {
            const createResponse = await apiPost(endpointUrl, {});
            expectBadRequestResponse(createResponse);
            expectBadRequiredBodyAttribute(createResponse, "Email is required");
            expectBadRequiredBodyAttribute(createResponse, "Password is required");
        });
    });

    describe('delete a logged in user', () => {
        const endpointUrl = '/auth';

        test('user deleted successfully', async () => {
            const accessToken = (await apiLoginUser(initialUsers[1])).body.accessToken;
            const deleteResponse = await apiDeleteWithAuth(endpointUrl, accessToken);
            expectSuccessfulRequestResponse(deleteResponse);
            const expectedBody = { message: 'Account deleted' };
            expect(deleteResponse.body).toEqual(expectedBody);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length - 1);
        });

        test('failed to delete a user because the user does not exist', async () => {
            const accessToken = (await apiLoginUser(initialUsers[1])).body.accessToken;
            const deleteResponse = await apiDeleteWithAuth(endpointUrl, accessToken);
            expectSuccessfulRequestResponse(deleteResponse);
            const deleteResponse2 = await apiDeleteWithAuth(endpointUrl, accessToken);
            expectNotFoundResponse(deleteResponse2);
            const expectedBody = { message: 'Invalid user' };
            expect(deleteResponse2.body).toEqual(expectedBody);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length - 1);
        });

        test('failed to delete a user because the access token is not valid', async () => {
            const accessToken = 'invalidToken#74.a6sd56_78942.#sdad@dsaf';
            const deleteResponse = await apiDeleteWithAuth(endpointUrl, accessToken);
            expectUnauthorizedResponse(deleteResponse);
            expectTokenErrorMessageReceived(deleteResponse);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });

        test('failed to delete a user because there is no access token', async () => {
            const deleteResponse = await apiDelete(endpointUrl);
            expectUnauthorizedResponse(deleteResponse);
            const expectedBody = { message: 'Not authorized' };
            expect(deleteResponse.body).toEqual(expectedBody);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });

        test('failed to delete a user because the access token is expired', async () => {
            const accessToken = (await apiLoginTestUser(initialUsers[1])).body.accessToken;
            const deleteResponse = await after1s(apiDeleteWithAuth,endpointUrl, accessToken);  // access token expires after 1 second
            expectUnauthorizedResponse(deleteResponse);
            expectTokenExpiredErrorMessageReceived(deleteResponse);
            await expectLengthOfDatabaseInstancesToBeTheSameWith(User, initialUsers.length);
        });
    });

    describe.skip('refresh an access token', () => {
        test('token refreshed successfully', async () => {
            const getResponse = await apiGet(endpointUrl, initialUsers[1]);
            expectSuccessfulRequestResponse(getResponse);            
            expect(getResponse.body.expiresIn).toBe(900);
            expect(getResponse.body.accessToken.length).toBeGreaterThan(0);
            expect(getResponse.body.refreshToken.length).toBeGreaterThan(0);
        });
    });

    // describe.skip('logout a user', () => {
    //     test('user logged out successfully', async () => {
    //         expect(true).toBe(true);
    //     });
    // });
});


afterAll(() => {
    sequelize.close();
    server.close();
});