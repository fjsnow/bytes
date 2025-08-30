import { calculateGeometricBigintCost } from "../../utils/math";
import { WORKERS, type WorkerId } from "./workers";

export interface Upgrade {
    id: string;
    name: string;
    cost: (owned: number) => bigint;
    description: string;
    maxOwned?: number;
    prerequisiteWorkerId?: string;
    prerequisitePrestige?: number;
}

const WORKER_UPGRADE_COST_MULTIPLIER = 8n;

const calculateWorkerUpgradeCost = (worker: WorkerId) =>
    WORKERS[worker].cost(0) * WORKER_UPGRADE_COST_MULTIPLIER;

export const UPGRADE_DATA: Upgrade[] = [
    {
        id: "mechanical_keyboards",
        name: "Mechanical Keyboards",
        cost: (owned) => calculateGeometricBigintCost(20n, 1.15, owned),
        description: "Each click produces +1 extra byte.",
        maxOwned: 10,
    },
    {
        id: "free_pizza",
        name: "Free Pizza Fridays",

        cost: (_owned) => calculateWorkerUpgradeCost("intern"),
        prerequisiteWorkerId: "intern",
        description: "Interns produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "pair_programming",
        name: "Pair Programming",

        cost: (_owned) => calculateWorkerUpgradeCost("junior_dev"),
        prerequisiteWorkerId: "junior_dev",
        description: "Junior Developers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "agile_methodology",
        name: "Agile Methodology",

        cost: (_owned) => calculateWorkerUpgradeCost("tech_lead"),
        prerequisiteWorkerId: "senior_dev",
        description: "Senior Developers and Tech Leads produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "scrum_masters",
        name: "Scrum Masters",

        cost: (_owned) => calculateWorkerUpgradeCost("engineering_manager"),
        prerequisiteWorkerId: "engineering_manager",
        description: "Engineering Managers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "corporate_synergy",
        name: "Corporate Synergy",

        cost: (_owned) => calculateWorkerUpgradeCost("vp_engineering"),
        prerequisiteWorkerId: "director",
        description: "Directors and VPs produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "executive_retreats",
        name: "Executive Retreats",

        cost: (_owned) => calculateWorkerUpgradeCost("ceo"),
        prerequisiteWorkerId: "cto",
        description: "CTOs and CEOs produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "golden_parachutes",
        name: "Golden Parachutes",

        cost: (_owned) => calculateWorkerUpgradeCost("chairman"),
        prerequisiteWorkerId: "board_member",
        description: "Board Members and Chairmen produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "global_monopoly",
        name: "Global Monopoly",
        cost: (_owned) => calculateWorkerUpgradeCost("conglomerate_owner"),
        prerequisiteWorkerId: "conglomerate_owner",
        description: "Conglomerate Owners produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "cloud_infrastructure",
        name: "Cloud Infrastructure",
        cost: (owned) => calculateGeometricBigintCost(1024n * 1024n, 2, owned),
        description: "All workers produce 25% more.",
        maxOwned: 5,
        prerequisitePrestige: 1,
    },
    {
        id: "ai_automation",
        name: "AI Automation",
        cost: (owned) =>
            calculateGeometricBigintCost(4n * 1024n * 1024n, 2, owned),
        description: "All workers produce 50% more.",
        maxOwned: 3,
        prerequisitePrestige: 1,
    },
];

UPGRADE_DATA.push(
    {
        id: "quantum_computing",
        name: "Quantum Computing",
        cost: (owned) =>
            calculateGeometricBigintCost(256n * 1024n ** 3n, 4, owned),
        description: "Further enhances all worker production significantly.",
        maxOwned: 1,
        prerequisitePrestige: 2,
    },
    {
        id: "universal_compiler",
        name: "Universal Compiler",
        cost: (owned) =>
            calculateGeometricBigintCost(512n * 1024n ** 3n, 4, owned),
        description: "Unlocks even more advanced production methods.",
        maxOwned: 1,
        prerequisitePrestige: 2,
    },

    {
        id: "hyperspace_optimization",
        name: "Hyperspace Optimization",
        cost: (owned) => calculateGeometricBigintCost(1024n ** 4n, 5, owned),
        description: "Multiplies all production by 2x.",
        maxOwned: 1,
        prerequisitePrestige: 3,
    },
);
