export interface Upgrade {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    maxOwned?: number;
}

export const UPGRADE_DATA: Upgrade[] = [
    {
        id: "mechanical_keyboards",
        name: "Mechanical Keyboards",
        description: "Each click produces +1 extra byte.",
        baseCost: 512,
        maxOwned: 10,
    },
    {
        id: "ergonomic_mice",
        name: "Ergonomic Mice",
        description: "Clicking speed limit increased by 50%.",
        baseCost: 8 * 1024 ** 1,
        maxOwned: 2,
    },
    {
        id: "free_pizza",
        name: "Free Pizza Fridays",
        description: "Interns produce 2× more.",
        baseCost: 64 * 1024 ** 1,
        maxOwned: 1,
    },
    {
        id: "pair_programming",
        name: "Pair Programming",
        description: "Junior Developers produce 2× more.",
        baseCost: 256 * 1024 ** 1,
        maxOwned: 1,
    },
    {
        id: "agile_methodology",
        name: "Agile Methodology",
        description: "Senior Developers and Tech Leads produce 2× more.",
        baseCost: 4 * 1024 ** 2,
        maxOwned: 1,
    },
    {
        id: "scrum_masters",
        name: "Scrum Masters",
        description: "Engineering Managers produce 2× more.",
        baseCost: 16 * 1024 ** 2,
        maxOwned: 1,
    },
    {
        id: "corporate_synergy",
        name: "Corporate Synergy",
        description: "Directors and VPs produce 2× more.",
        baseCost: 256 * 1024 ** 2,
        maxOwned: 1,
    },
    {
        id: "executive_retreats",
        name: "Executive Retreats",
        description: "CTOs and CEOs produce 2× more.",
        baseCost: 8 * 1024 ** 3,
        maxOwned: 1,
    },
    {
        id: "golden_parachutes",
        name: "Golden Parachutes",
        description: "Board Members and Chairmen produce 2× more.",
        baseCost: 256 * 1024 ** 3,
        maxOwned: 1,
    },
    {
        id: "global_monopoly",
        name: "Global Monopoly",
        description: "Conglomerate Owners produce 2× more.",
        baseCost: 16 * 1024 ** 4,
        maxOwned: 1,
    },
    {
        id: "cloud_infrastructure",
        name: "Cloud Infrastructure",
        description: "All workers produce 25% more.",
        baseCost: 1024 ** 2,
        maxOwned: 5,
    },
    {
        id: "ai_automation",
        name: "AI Automation",
        description: "All workers produce 50% more.",
        baseCost: 1024 ** 3,
        maxOwned: 3,
    },
    {
        id: "quantum_efficiency",
        name: "Quantum Efficiency",
        description: "Doubles all production.",
        baseCost: 1024 ** 4,
        maxOwned: 1,
    },
];

export type UpgradeId = (typeof UPGRADE_DATA)[number]["id"];
