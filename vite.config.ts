import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'remotion-renderer-api',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/render-video' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const inputProps = JSON.parse(body);
                  
                  // Ensure temp directory exists under public
                  if (!fs.existsSync('./public/temp')) {
                    fs.mkdirSync('./public/temp', { recursive: true });
                  }
                  
                  // Write inputs to JSON
                  const inputPath = './public/temp/inputs.json';
                  fs.writeFileSync(inputPath, JSON.stringify(inputProps, null, 2));
                  
                  // Output path
                  const isVertical = inputProps.aspectRatio === '9:16';
                  const compositionId = isVertical ? 'ProposalVideoVertical' : 'ProposalVideo';
                  const prefix = isVertical ? 'vertical-' : 'horizontal-';
                  const outputVideoName = `propuesta-${prefix}${inputProps.clientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.mp4`;
                  const outputPath = `./public/temp/${outputVideoName}`;
                  
                  // Run Remotion CLI command
                  const command = `npx remotion render src/remotion-entry.tsx ${compositionId} ${outputPath} --input-props=${inputPath} --overwrite`;
                  
                  console.log(`[Remotion Video Renderer] Executing command: ${command}`);
                  
                  exec(command, (error, stdout, stderr) => {
                    if (error) {
                      console.error(`[Remotion Video Renderer] Error: ${error.message}`);
                      console.error(stderr);
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: 'Fallo al renderizar el video con Remotion CLI', details: error.message }));
                      return;
                    }
                    console.log(`[Remotion Video Renderer] Render completed successfully.`);
                    console.log(stdout);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, videoUrl: `/temp/${outputVideoName}` }));
                  });
                } catch (err) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Formato de petición inválido', details: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
