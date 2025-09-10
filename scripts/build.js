const { execSync } = require('child_process');

try {
    execSync('tsc', { stdio: 'inherit' });
} catch (e) {
    process.exit(1);
}
