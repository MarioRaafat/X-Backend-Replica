import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let app_controller: AppController;
    let app_service: AppService;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        app_controller = app.get<AppController>(AppController);
        app_service = app.get<AppService>(AppService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(app_controller).toBeDefined();
        expect(app_service).toBeDefined();
    });

    describe('checkHealth', () => {
        it('should return application health status', () => {
            const result = app_controller.checkHealth();
            expect(result).toBe('Application is running');
        });

        it('should call app_service.getHealthStatus', () => {
            const get_health_status_spy = jest.spyOn(app_service, 'getHealthStatus');

            app_controller.checkHealth();

            expect(get_health_status_spy).toHaveBeenCalledTimes(1);
        });

        it('should return the exact string from service', () => {
            const mock_status = 'Custom health message';
            jest.spyOn(app_service, 'getHealthStatus').mockReturnValue(mock_status);

            const result = app_controller.checkHealth();

            expect(result).toBe(mock_status);
        });
    });
});
