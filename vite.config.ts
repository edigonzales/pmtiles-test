import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
        plugins: [sveltekit()],
        test: {
                environment: 'jsdom',
                setupFiles: ['src/setupTests.ts'],
                globals: true,
                css: true,
                deps: {
                        optimizer: {
                                web: {
                                        include: ['carbon-components-svelte']
                                }
                        }
                },
                environmentOptions: {
                        customExportConditions: ['browser']
                }
        }
});
