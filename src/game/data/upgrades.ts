export interface Upgrade {
    id: string;
    name: string;
    cost: (owned: number) => number;
    description: string;
    maxOwned?: number;
}

export const UPGRADE_DATA: Upgrade[] = [
    {
        id: "mechanical_keyboards",
        name: "Mechanical Keyboards",
        cost: (owned) => {
            return Math.floor(512 * Math.pow(1.15, owned));
        },
        description: "Each click produces +1 extra byte.",
        maxOwned: 10,
    },
    {
        id: "ergonomic_mice",
        name: "Ergonomic Mice",
        cost: (owned) => {
            return Math.floor(8 * 1024 ** 1 * Math.pow(1.5, owned));
        },
        description: "Clicking speed limit increased by 50%. Max: 2.",
        maxOwned: 2,
    },
    {
        id: "free_pizza",
        name: "Free Pizza Fridays",
        cost: (owned) => {
            return Math.floor(64 * 1024 ** 1 * Math.pow(1.15, owned));
        },
        description: "Interns produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "pair_programming",
        name: "Pair Programming",
        cost: (owned) => {
            return Math.floor(256 * 1024 ** 1 * Math.pow(1.15, owned));
        },
        description: "Junior Developers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "agile_methodology",
        name: "Agile Methodology",
        cost: (owned) => {
            return Math.floor(4 * 1024 ** 2 * Math.pow(1.15, owned));
        },
        description: "Senior Developers and Tech Leads produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "scrum_masters",
        name: "Scrum Masters",
        cost: (owned) => {
            return Math.floor(16 * 1024 ** 2 * Math.pow(1.15, owned));
        },
        description: "Engineering Managers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "corporate_synergy",
        name: "Corporate Synergy",
        cost: (owned) => {
            return Math.floor(256 * 1024 ** 2 * Math.pow(1.15, owned));
        },
        description: "Directors and VPs produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "executive_retreats",
        name: "Executive Retreats",
        cost: (owned) => {
            return Math.floor(8 * 1024 ** 3 * Math.pow(1.15, owned));
        },
        description: "CTOs and CEOs produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "golden_parachutes",
        name: "Golden Parachutes",
        cost: (owned) => {
            return Math.floor(256 * 1024 ** 3 * Math.pow(1.15, owned));
        },
        description: "Board Members and Chairmen produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "global_monopoly",
        name: "Global Monopoly",
        cost: (owned) => {
            return Math.floor(16 * 1024 ** 4 * Math.pow(1.15, owned));
        },
        description: "Conglomerate Owners produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "cloud_infrastructure",
        name: "Cloud Infrastructure",
        cost: (owned) => {
            return Math.floor(1024 ** 2 * Math.pow(2, owned));
        },
        description: "All workers produce 25% more.",
        maxOwned: 5,
    },
    {
        id: "ai_automation",
        name: "AI Automation",
        cost: (owned) => {
            return Math.floor(1024 ** 3 * Math.pow(2.5, owned));
        },
        description: "All workers produce 50% more.",
        maxOwned: 3,
    },
    {
        id: "quantum_efficiency",
        name: "Quantum Efficiency",
        cost: (owned) => {
            return Math.floor(1024 ** 4 * Math.pow(3, owned));
        },
        description: "Doubles all production.",
        maxOwned: 1,
    },
];

export type UpgradeId = (typeof UPGRADE_DATA)[number]["id"];
