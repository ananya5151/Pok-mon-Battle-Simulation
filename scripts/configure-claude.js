/* Configure Claude Desktop to connect to this MCP server.
 * Creates or updates claude_desktop_config.json with a "pokemon-battle" entry.
 */
const fs = require('fs');
const path = require('path');

function getClaudeConfigPath() {
    const plat = process.platform;
    if (plat === 'win32') {
        const appdata = process.env.APPDATA;
        if (!appdata) {
            throw new Error('APPDATA env var not found.');
        }
        return path.join(appdata, 'Claude', 'claude_desktop_config.json');
    }
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
        throw new Error('HOME/USERPROFILE env var not found.');
    }
    if (plat === 'darwin') {
        return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    // linux and others
    return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
}

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function main() {
    const projectRoot = process.cwd();
    const serverEntry = path.join(projectRoot, 'dist', 'index.js');
    if (!fs.existsSync(serverEntry)) {
        console.error(`[configure-claude] Build artifact not found: ${serverEntry}`);
        console.error('[configure-claude] Run "npm run build" first.');
        process.exit(1);
    }

    const cfgPath = getClaudeConfigPath();
    ensureDir(cfgPath);

    let cfg = {};
    if (fs.existsSync(cfgPath)) {
        try {
            const raw = fs.readFileSync(cfgPath, 'utf8');
            cfg = raw.trim() ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('[configure-claude] Existing config not valid JSON; overwriting.');
            cfg = {};
        }
    }

    if (!cfg.mcpServers || typeof cfg.mcpServers !== 'object') {
        cfg.mcpServers = {};
    }

    // Use absolute Node executable to avoid PATH issues in Electron
    const nodeCmd = process.execPath || 'node';
    // Normalize to forward slashes for safer JSON/Windows handling
    const normalizedEntry = serverEntry.replace(/\\/g, '/');

    cfg.mcpServers['pokemon-battle'] = {
        command: nodeCmd,
        args: [normalizedEntry],
        env: { DEBUG: 'true' }
    };

    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    console.log('[configure-claude] Wrote config: ' + cfgPath);
    console.log('[configure-claude] Entry "pokemon-battle" -> ' + nodeCmd + ' ' + normalizedEntry);
    console.log('[configure-claude] Restart Claude Desktop to take effect.');
}

main();
