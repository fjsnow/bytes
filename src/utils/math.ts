function getDecimalPlaces(num: number): number {
    if (Math.floor(num) === num) return 0;

    const stringNum = num.toString();
    const decimalPart = stringNum.split(".")[1];
    return decimalPart ? decimalPart.length : 0;
}

export function multiplyBigintWithDecimal(
    value: bigint,
    factor: number,
): bigint {
    const decimalPlaces = getDecimalPlaces(factor);
    if (decimalPlaces === 0) {
        return value * BigInt(Math.round(factor));
    }

    const scale = 10n ** BigInt(decimalPlaces);
    const scaledFactor = BigInt(Math.round(factor * Number(scale)));
    return (value * scaledFactor) / scale;
}

export function calculateGeometricBigintCost(
    initialCost: bigint,
    multiplier: number,
    owned: number,
): bigint {
    let cost = initialCost;
    for (let i = 0; i < owned; i++)
        cost = multiplyBigintWithDecimal(cost, multiplier);
    return cost;
}
