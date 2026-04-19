importScripts('https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@2.0.0/dist/uv.bundle.js');
importScripts('/public/uv.config.js'); // UPDATED PATH HERE
importScripts('https://cdn.jsdelivr.net/npm/@titaniumnetwork-dev/ultraviolet@2.0.0/dist/uv.sw.js');

const uv = new UVServiceWorker();
let activeScripts = [];

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'UPDATE_SCRIPTS') {
        activeScripts = event.data.scripts || [];
    }
});

self.addEventListener('install', event => {
    self.skipWaiting();
});
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        (async () => {
            if (event.request.url.startsWith(location.origin + self.__uv$config.prefix)) {
                try {
                    const response = await uv.fetch(event);

                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('text/html') && activeScripts.length > 0) {
                        let html = await response.text();
                        
                        let scriptTags = activeScripts.map(s => `<script>${s}</script>`).join('\n');
                        
                        if (html.includes('</body>')) {
                            html = html.replace('</body>', `${scriptTags}\n</body>`);
                        } else {
                            html += scriptTags;
                        }

                        const newHeaders = new Headers(response.headers);
                        newHeaders.delete('content-length');
                        newHeaders.delete('content-security-policy'); 
                        
                        return new Response(html, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: newHeaders
                        });
                    }
                    return response;
                } catch (err) {
                    console.error("UV Fetch Error:", err);
                    return new Response("Failed to load page.", { status: 500 });
                }
            }
            return await fetch(event.request);
        })()
    );
});
