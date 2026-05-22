import * as http from 'http';

interface NgrokTunnel {
    name: string;
    public_url: string;
    proto: string;
    config?: {
        addr: string;
    };
}

function queryNgrokApi(port: number, configUrl?: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        let resolved = false;
        
        const done = (val: string | undefined) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(val);
            }
        };

        const options = {
            hostname: '127.0.0.1',
            port: port,
            path: '/api/tunnels',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const tunnels: NgrokTunnel[] = parsed.tunnels || [];
                    
                    if (tunnels.length === 0) {
                        done(undefined);
                        return;
                    }

                    // Helper to normalize URL for matching
                    const normalize = (url: string) => {
                        return url
                            .replace(/^(https?:\/\/)?(www\.)?/, '')
                            .replace(/\/$/, '')
                            .replace(/:80$/, '')
                            .replace(/:443$/, '')
                            .trim()
                            .toLowerCase();
                    };
                    const target = configUrl ? normalize(configUrl) : '';

                    if (target) {
                        const matched = tunnels.find(t => {
                            const addr = t.config?.addr;
                            return addr && normalize(addr) === target;
                        });
                        if (matched) {
                            done(matched.public_url);
                            return;
                        }
                        done(undefined);
                        return;
                    }

                    if (tunnels.length === 1) {
                        done(tunnels[0].public_url);
                        return;
                    }

                    done(tunnels[0].public_url);
                } catch (e) {
                    done(undefined);
                }
            });
        });

        // Set a strict 1.0 second timeout for the entire connection + response lifecycle
        const timeoutId = setTimeout(() => {
            req.destroy();
            done(undefined);
        }, 1000);

        req.on('error', () => {
            done(undefined);
        });

        req.end();
    });
}

/**
 * Fetches the active public tunnel URL from the local running ngrok API by probing ports 4040, 4041, and 4042.
 * Matches it against the target local URL if provided, otherwise returns the single active tunnel.
 */
export async function fetchNgrokPublicUrl(configUrl?: string): Promise<string | undefined> {
    const ports = [4040, 4041, 4042];
    for (const port of ports) {
        try {
            const url = await queryNgrokApi(port, configUrl);
            if (url) {
                return url;
            }
        } catch (e) {
            // Probe failed on this port, continue
        }
    }
    return undefined;
}
