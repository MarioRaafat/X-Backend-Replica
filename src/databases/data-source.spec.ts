import { DataSource } from 'typeorm';
import data_source from './data-source';

describe('DataSource', () => {
    it('should export a DataSource instance', () => {
        expect(data_source).toBeDefined();
        expect(data_source).toBeInstanceOf(DataSource);
    });

    it('should be configured with postgres type', () => {
        expect(data_source.options.type).toBe('postgres');
    });

    it('should have entities configured', () => {
        const options = data_source.options as any;
        expect(options.entities).toBeDefined();
        expect(Array.isArray(options.entities)).toBe(true);
        expect(options.entities.length).toBeGreaterThan(0);
    });

    it('should have migrations path configured', () => {
        const options = data_source.options as any;
        expect(options.migrations).toBeDefined();
        expect(Array.isArray(options.migrations)).toBe(true);
    });

    it('should have synchronize disabled', () => {
        const options = data_source.options as any;
        expect(options.synchronize).toBe(false);
    });

    it('should have database configuration', () => {
        const options = data_source.options as any;
        expect(options.host).toBeDefined();
        expect(options.database).toBeDefined();
        expect(options.username).toBeDefined();
    });

    it('should have default port or configured port', () => {
        const options = data_source.options as any;
        expect(options.port).toBeDefined();
        expect(typeof options.port).toBe('number');
    });
});
