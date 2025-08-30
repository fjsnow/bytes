export interface Upgrade {
    id: string;
    name: string;
    cost: (owned: number) => bigint;
    description: string;
    maxOwned?: number;
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

export const UPGRADE_DATA: Upgrade[] = [
    {
        id: "mechanical_keyboards",
        name: "Mechanical Keyboards",
        cost: (owned) => bigintGeometricCost(512n, 115n, 100n, owned),
        description: "Each click produces +1 extra byte.",
        maxOwned: 10,
    },
    {
        id: "ergonomic_mice",
        name: "Ergonomic Mice",
        cost: (owned) => bigintGeometricCost(8n * 1024n, 150n, 100n, owned),
        description: "Clicking speed limit increased by 50%. Max: 2.",
        maxOwned: 2,
    },
    {
        id: "free_pizza",
        name: "Free Pizza Fridays",
        cost: (owned) => bigintGeometricCost(64n * 1024n, 115n, 100n, owned),
        description: "Interns produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "pair_programming",
        name: "Pair Programming",
        cost: (owned) => bigintGeometricCost(256n * 1024n, 115n, 100n, owned),
        description: "Junior Developers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "agile_methodology",
        name: "Agile Methodology",
        cost: (owned) =>
            bigintGeometricCost(4n * 1024n ** 2n, 115n, 100n, owned),
        description: "Senior Developers and Tech Leads produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "scrum_masters",
        name: "Scrum Masters",
        cost: (owned) =>
            bigintGeometricCost(16n * 1024n ** 2n, 115n, 100n, owned),
        description: "Engineering Managers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "corporate_synergy",
        name: "Corporate Synergy",
        cost: (owned) =>
            bigintGeometricCost(256n * 1024n ** 2n, 115n, 100n, owned),
        description: "Directors and VPs produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "executive_retreats",
        name: "Executive Retreats",
        cost: (owned) =>
            bigintGeometricCost(8n * 1024n ** 3n, 115n, 100n, owned),
        description: "CTOs and CEOs produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "golden_parachutes",
        name: "Golden Parachutes",
        cost: (owned) => bigintGeometricCost(1024n ** 5n, 115n, 100n, owned),
        description: "Board Members and Chairmen produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "global_monopoly",
        name: "Global Monopoly",
        cost: (owned) =>
            bigintGeometricCost(16n * 1024n ** 4n, 115n, 100n, owned),
        description: "Conglomerate Owners produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "cloud_infrastructure",
        name: "Cloud Infrastructure",
        cost: (owned) => 1024n ** 4n * 1024n ** BigInt(owned),
        description: "All workers produce 25% more.",
        maxOwned: 5,
    },
    {
        id: "ai_automation",
        name: "AI Automation",
        cost: (owned) => 1024n ** 5n * (1024n ** 2n) ** BigInt(owned),
        description: "All workers produce 50% more.",
        maxOwned: 3,
    },
    {
        id: "quantum_efficiency",
        name: "Quantum Efficiency",
        cost: (owned) => 1024n ** 8n * 1024n ** BigInt(owned),
        description: "Doubles all production.",
        maxOwned: 1,
    },
];

export type UpgradeId = (typeof UPGRADE_DATA)[number]["id"];
