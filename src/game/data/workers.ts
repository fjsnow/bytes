export interface Worker {
    id: string;
    name: string;
    cost: (owned: number) => bigint;
    baseCookiesPerSecond: bigint;
}

function bigintGeometricCost(
    initialCost: bigint,
    multiplier: bigint,
    divisor: bigint,
    owned: number,
): bigint {
    let cost = initialCost;
    for (let i = 0; i < owned; i++)
        cost = (cost * multiplier + divisor - 1n) / divisor;

    return cost;
}

export const WORKER_DATA: Worker[] = [
    {
        id: "intern",
        name: "Intern",
        cost: (owned) => bigintGeometricCost(10n, 115n, 100n, owned),
        baseCookiesPerSecond: 1n,
    },
    {
        id: "junior_dev",
        name: "Junior Developer",
        cost: (owned) => bigintGeometricCost(1024n, 115n, 100n, owned),
        baseCookiesPerSecond: 16n,
    },
    {
        id: "senior_dev",
        name: "Senior Developer",
        cost: (owned) => bigintGeometricCost(32n * 1024n, 115n, 100n, owned),
        baseCookiesPerSecond: 256n,
    },
    {
        id: "tech_lead",
        name: "Tech Lead",
        cost: (owned) => bigintGeometricCost(1024n ** 2n, 115n, 100n, owned),
        baseCookiesPerSecond: 4n * 1024n,
    },
    {
        id: "engineering_manager",
        name: "Engineering Manager",
        cost: (owned) =>
            bigintGeometricCost(32n * 1024n ** 2n, 115n, 100n, owned),
        baseCookiesPerSecond: 64n * 1024n,
    },
    {
        id: "director",
        name: "Director of Engineering",
        cost: (owned) => bigintGeometricCost(1024n ** 3n, 115n, 100n, owned),
        baseCookiesPerSecond: 1024n ** 2n,
    },
    {
        id: "vp_engineering",
        name: "VP of Engineering",
        cost: (owned) =>
            bigintGeometricCost(32n * 1024n ** 3n, 115n, 100n, owned),
        baseCookiesPerSecond: 16n * 1024n ** 2n,
    },
    {
        id: "cto",
        name: "Chief Technology Officer",
        cost: (owned) => bigintGeometricCost(1024n ** 4n, 115n, 100n, owned),
        baseCookiesPerSecond: 256n * 1024n ** 2n,
    },
    {
        id: "ceo",
        name: "Chief Executive Officer",
        cost: (owned) =>
            bigintGeometricCost(32n * 1024n ** 4n, 115n, 100n, owned),
        baseCookiesPerSecond: 4n * 1024n ** 3n,
    },
    {
        id: "board_member",
        name: "Board Member",
        cost: (owned) => bigintGeometricCost(1024n ** 5n, 115n, 100n, owned),
        baseCookiesPerSecond: 64n * 1024n ** 3n,
    },
    {
        id: "chairman",
        name: "Chairman",
        cost: (owned) =>
            bigintGeometricCost(32n * 1024n ** 5n, 115n, 100n, owned),
        baseCookiesPerSecond: 1024n ** 4n,
    },
    {
        id: "conglomerate_owner",
        name: "Conglomerate Owner",
        cost: (owned) => bigintGeometricCost(1024n ** 6n, 115n, 100n, owned),
        baseCookiesPerSecond: 16n * 1024n ** 4n,
    },
];

export type WorkerId = (typeof WORKER_DATA)[number]["id"];
