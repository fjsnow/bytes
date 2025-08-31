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

const WORKER_UPGRADE_COST_MULTIPLIER = 4n;

const calculateWorkerUpgradeCost = (worker: WorkerId) =>
    WORKERS[worker].cost(0) * WORKER_UPGRADE_COST_MULTIPLIER;

export const UPGRADE_DATA: Upgrade[] = [
    {
        id: "mechanical_keyboards",
        name: "Mechanical Keyboards",
        cost: (owned) => calculateGeometricBigintCost(16n, 2, owned),
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
        prerequisiteWorkerId: "project_manager",
        description:
            "Project Managers and Engineering Managers produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "corporate_synergy",
        name: "Corporate Synergy",
        cost: (_owned) => calculateWorkerUpgradeCost("director"),
        prerequisiteWorkerId: "principal_engineer",
        description: "Principal Engineers and Directors produce 2× more.",
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
        id: "founder_vision",
        name: "Founder's Vision",
        cost: (_owned) => calculateWorkerUpgradeCost("founder"),
        prerequisiteWorkerId: "founder",
        description: "Founders produce 2× more.",
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
        cost: (_owned) => calculateWorkerUpgradeCost("angel_investor"),
        prerequisiteWorkerId: "conglomerate_owner",
        description: "Conglomerate Owners and Angel Investors produce 2× more.",
        maxOwned: 1,
    },
    {
        id: "cloud_infrastructure",
        name: "Cloud Infrastructure",
        cost: (owned) =>
            calculateGeometricBigintCost(4n * 1024n ** 3n, 256, owned),
        description: "All workers produce 25% more.",
        maxOwned: 2,
        prerequisitePrestige: 1,
    },
    {
        id: "ai_automation",
        name: "AI Automation",
        cost: (_owned) => 256n * 1024n ** 4n,
        description: "All workers produce 50% more.",
        maxOwned: 1,
        prerequisitePrestige: 3,
    },
    {
        id: "quantum_computing",
        name: "Quantum Computing",
        cost: (_owned) => 8n * 1024n ** 5n,
        description: "Double the produce of all workers.",
        maxOwned: 1,
        prerequisitePrestige: 4,
    },
    {
        id: "universal_compiler",
        name: "Universal Compiler",
        cost: (_owned) => 16n * 1024n ** 6n,
        description: "Unlocks even more advanced production methods.",
        maxOwned: 1,
        prerequisitePrestige: 5,
    },
    {
        id: "hyperspace_optimization",
        name: "Hyperspace Optimization",
        cost: (_owned) => 512n * 1024n ** 6n,
        description: "Multiplies all production by 2x.",
        maxOwned: 1,
        prerequisitePrestige: 5,
    },
];
