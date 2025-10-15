import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
    let app: INestApplication<App>;

    beforeEach(async () => {
        const module_fixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = module_fixture.createNestApplication();
        await app.init();
    });
});
