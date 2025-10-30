// src/common/money.ts
import { Prisma } from '@prisma/client';

// Alias útil
export type Decimal = Prisma.Decimal;
type DecLike = number | string | bigint | Decimal;

/** Guard más robusto que solo `instanceof` */
function isDec(x: unknown): x is Decimal {
    // Prisma.Decimal en runtime tiene estos métodos
    return (
        !!x &&
        typeof x === 'object' &&
        typeof (x as any).toNumber === 'function' &&
        typeof (x as any).toFixed === 'function'
    );
}

/** Verifica que un número sea entero (pesos) y finito. */
export function assertPesosEnteros(n: number, name = 'valor'): void {
    if (!Number.isFinite(n) || Math.trunc(n) !== n) {
        throw new Error(`${name} debe ser un entero en pesos`);
    }
}

/** Convierte a Prisma.Decimal. */
export function toDec(v: DecLike): Decimal {
    if (isDec(v)) return v;

    if (typeof v === 'bigint') {
        return new Prisma.Decimal(v.toString());
    }

    if (typeof v === 'number') {
        // aseguramos que si es para pesos, sea entero
        assertPesosEnteros(v, 'Decimal(number)');
        return new Prisma.Decimal(v);
    }

    // string
    return new Prisma.Decimal(String(v));
}

/** Convierte Decimal (o null/undefined) a number (pesos enteros). */
export function decToNumber(v?: DecLike | null): number {
    if (v == null) return 0;
    const n = toDec(v).toNumber();
    // si esperas SIEMPRE enteros (pesos), validamos aquí también
    if (!Number.isFinite(n) || Math.trunc(n) !== n) {
        throw new Error('Decimal a número no es entero en pesos');
    }
    return n;
}

/** Suma Decimals (entrada flexible). */
export function addDec(a: DecLike, b: DecLike): Decimal {
    return toDec(a).add(toDec(b));
}

/** Resta Decimals (entrada flexible). */
export function subDec(a: DecLike, b: DecLike): Decimal {
    return toDec(a).sub(toDec(b));
}

/** Multiplica Decimals (útil en cashout/premios). */
export function mulDec(a: DecLike, b: DecLike): Decimal {
    return toDec(a).mul(toDec(b));
}

/** Divide Decimals (con validación). */
export function divDec(a: DecLike, b: DecLike): Decimal {
    const divisor = toDec(b);
    if (divisor.isZero()) throw new Error('División por cero en Decimal');
    return toDec(a).div(divisor);
}
