import chalk from "chalk";

export const getCookieGray = (phase: number) => {
    const clamped = Math.max(1, Math.min(phase, 10));
    const v = Math.round(((clamped - 1) / 9) * (254 - 120) + 120);
    return chalk.rgb(v, v, v);
};

export const getFallingBitGray = (phase: number) => {
    const clamped = Math.max(1, Math.min(phase, 20));
    const v = Math.round(((clamped - 1) / 19) * (200 - 50) + 50);
    return chalk.rgb(v, v, v);
};
