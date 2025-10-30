import crypto from 'crypto';

export function hmacToUnit(seed: Buffer, msg: string) {
    const h = crypto.createHmac('sha256', seed).update(msg).digest('hex');
    const frac = parseInt(h.slice(0, 13), 16) / 2 ** 52;
    return frac;
}

export function mapToCrashX(p: number) {
    if (p < 0.85) return 1.01 + Math.random() * (2.5 - 1.01);
    if (p < 0.98) return 2.5 + Math.random() * (8.0 - 2.5);
    return 8.1 + Math.random() * (500.0 - 8.1);
}
